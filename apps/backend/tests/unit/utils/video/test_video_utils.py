import pytest
import cv2
import numpy as np
from unittest.mock import Mock, patch, mock_open


from utils.video.video_utils import VideoUtils
from models.frame import Frame


@pytest.fixture
def mock_video_bytes():
    return b"fake_video_data"


@pytest.fixture
def mock_frame_data():
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buffer = cv2.imencode('.jpg', img)
    return buffer.tobytes()


@pytest.fixture
def video_utils(mock_video_bytes):
    return VideoUtils(mock_video_bytes)


class TestVideoUtils:
    
    def test_init(self, mock_video_bytes):
        video_utils = VideoUtils(mock_video_bytes)
        assert video_utils.video == mock_video_bytes

    @patch('utils.video.video_utils.os.remove')
    @patch('builtins.open', new_callable=mock_open)
    @patch('utils.video.video_utils.time.time', return_value=1234567890.123)
    def test_create_temp_video_file(self, mock_time, mock_file, mock_remove, mock_video_bytes):
        video_utils = VideoUtils(mock_video_bytes)
        video_utils._create_temp_video_file()
        
        expected_path = "/tmp/temp_video_1234567890123.mp4"
        assert video_utils.temp_video_path == expected_path
        mock_file.assert_called_once_with(expected_path, "wb")
        mock_file().write.assert_called_once_with(mock_video_bytes)

    @patch('utils.video.video_utils.os.remove')
    def test_cleanup_temp_video_file_success(self, mock_remove, video_utils):
        video_utils.temp_video_path = "/tmp/test.mp4"
        video_utils._cleanup_temp_video_file()
        mock_remove.assert_called_once_with("/tmp/test.mp4")

    @patch('utils.video.video_utils.os.remove', side_effect=Exception("Remove failed"))
    @patch('utils.video.video_utils.logger')
    def test_cleanup_temp_video_file_error(self, mock_logger, mock_remove, video_utils):
        video_utils.temp_video_path = "/tmp/test.mp4"
        video_utils._cleanup_temp_video_file()
        mock_logger.error.assert_called_once()

    @patch('utils.video.video_utils.detect')
    def test_extract_scenes_from_video(self, mock_detect, video_utils):
        mock_scene_start = Mock()
        mock_scene_start.get_seconds.return_value = 0.0
        mock_scene_end = Mock()
        mock_scene_end.get_seconds.return_value = 5.0
        
        mock_detect.return_value = [(mock_scene_start, mock_scene_end)]
        video_utils.temp_video_path = "/tmp/test.mp4"
        
        video_utils._extract_scenes_from_video()
        
        assert video_utils.scenes == [(0.0, 5.0)]
        mock_detect.assert_called_once()

    def test_calculate_image_similarity_identical(self, video_utils):
        img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        similarity = video_utils._calculate_image_similarity(img, img)
        assert similarity == pytest.approx(1.0, abs=1e-5)

    def test_calculate_image_similarity_different(self, video_utils):
        img1 = np.zeros((100, 100, 3), dtype=np.uint8)
        img2 = np.ones((100, 100, 3), dtype=np.uint8) * 255
        similarity = video_utils._calculate_image_similarity(img1, img2)
        assert similarity < 1.0

    @patch('utils.video.video_utils.cv2.VideoCapture')
    def test_pick_best_frame_from_scene(self, mock_cv2_cap, video_utils, mock_frame_data):
        mock_cap = Mock()
        mock_cv2_cap.return_value = mock_cap
        mock_cap.get.return_value = 30.0
        mock_cap.read.side_effect = [
            (True, np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)),
        ] + [(False, None)] * 50
        
        with patch('utils.video.video_utils.cv2.cvtColor') as mock_cvt, \
             patch('utils.video.video_utils.cv2.Laplacian') as mock_lap, \
             patch('utils.video.video_utils.cv2.imencode', return_value=(True, np.frombuffer(mock_frame_data, dtype=np.uint8))):
            
            mock_cvt.return_value = np.zeros((100, 100), dtype=np.uint8)
            mock_lap.return_value.var.return_value = 100.0
            
            video_utils.temp_video_path = "/tmp/test.mp4"
            video_utils.scenes = [(0.0, 1.0)]
            result = video_utils._pick_best_frame_from_scene()
            
            assert len(result) == 1
            assert isinstance(result[0], Frame)
            assert result[0].data == mock_frame_data
            mock_cap.release.assert_called_once()

    def test_deduplicate_frames_no_duplicates(self, video_utils, mock_frame_data):
        frame1 = Frame(data=mock_frame_data, timestamp=1.0)
        frame2 = Frame(data=mock_frame_data, timestamp=2.0)
        
        with patch.object(video_utils, '_calculate_image_similarity', return_value=0.5):
            result = video_utils._deduplicate_frames([frame1, frame2])
            assert len(result) == 2

    def test_deduplicate_frames_with_duplicates(self, video_utils, mock_frame_data):
        frame1 = Frame(data=mock_frame_data, timestamp=1.0)
        frame2 = Frame(data=mock_frame_data, timestamp=2.0)
        
        with patch.object(video_utils, '_calculate_image_similarity', return_value=0.95):
            result = video_utils._deduplicate_frames([frame1, frame2])
            assert len(result) == 1
            assert result[0].timestamp == 1.0

    @patch.object(VideoUtils, '_cleanup_temp_video_file')
    @patch.object(VideoUtils, '_deduplicate_frames')
    @patch.object(VideoUtils, '_pick_best_frame_from_scene')
    @patch.object(VideoUtils, '_extract_scenes_from_video')
    @patch.object(VideoUtils, '_create_temp_video_file')
    def test_get_unique_frames_success(self, mock_create, mock_extract, mock_pick, mock_dedup, mock_cleanup, video_utils, mock_frame_data):
        frame = Frame(data=mock_frame_data, timestamp=1.0)
        mock_pick.return_value = [frame]
        mock_dedup.return_value = [frame]
        
        result = video_utils.get_unique_frames()
        
        assert result == [frame]
        mock_create.assert_called_once()
        mock_extract.assert_called_once()
        mock_pick.assert_called_once()
        mock_dedup.assert_called_once()
        mock_cleanup.assert_called_once()

    @patch.object(VideoUtils, '_cleanup_temp_video_file')
    @patch.object(VideoUtils, '_create_temp_video_file', side_effect=Exception("Test error"))
    @patch('utils.video.video_utils.logger')
    def test_get_unique_frames_error(self, mock_logger, mock_create, mock_cleanup, video_utils):
        result = video_utils.get_unique_frames()
        
        assert result == []
        mock_logger.error.assert_called_once()
        mock_cleanup.assert_called_once()

    @patch('utils.video.video_utils.cv2.VideoCapture')
    def test_pick_best_frame_from_scene_no_valid_frames(self, mock_cv2_cap, video_utils):
        mock_cap = Mock()
        mock_cv2_cap.return_value = mock_cap
        mock_cap.get.return_value = 30.0
        mock_cap.read.return_value = (False, None)
        
        video_utils.temp_video_path = "/tmp/test.mp4"
        video_utils.scenes = [(0.0, 1.0)]
        result = video_utils._pick_best_frame_from_scene()
        
        assert result == []
        mock_cap.release.assert_called_once()

    def test_deduplicate_frames_empty_list(self, video_utils):
        result = video_utils._deduplicate_frames([])
        assert result == []

    def test_deduplicate_frames_single_frame(self, video_utils, mock_frame_data):
        frame = Frame(data=mock_frame_data, timestamp=1.0)
        result = video_utils._deduplicate_frames([frame])
        assert result == [frame]