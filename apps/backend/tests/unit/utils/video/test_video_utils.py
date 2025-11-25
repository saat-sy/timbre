import pytest
import cv2
import numpy as np
import base64
from unittest.mock import Mock, patch, mock_open
from PIL import Image
from io import BytesIO

from utils.video.video_utils import VideoUtils
from models.frame import Frame


@pytest.fixture
def mock_video_bytes():
    return b"fake_video_data"


@pytest.fixture
def mock_frame_data():
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buffer = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    return buffer.tobytes()


@pytest.fixture
def mock_base64_frame_data():
    """Create a base64-encoded frame data for testing."""
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buffer = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    return base64.b64encode(buffer.tobytes()).decode("utf-8")


@pytest.fixture
def mock_base64_frame_data_different():
    """Create a different base64-encoded frame data for testing."""
    img = np.ones((100, 100, 3), dtype=np.uint8) * 255  # White image
    _, buffer = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    return base64.b64encode(buffer.tobytes()).decode("utf-8")


@pytest.fixture
def video_utils(mock_video_bytes):
    return VideoUtils(mock_video_bytes)


class TestVideoUtils:

    def test_init(self, mock_video_bytes):
        video_utils = VideoUtils(mock_video_bytes)
        assert video_utils.video == mock_video_bytes
        assert hasattr(video_utils, "helper_utils")

    @patch("utils.video.video_utils.detect")
    def test_extract_scenes_from_video(self, mock_detect, video_utils):
        mock_scene_start = Mock()
        mock_scene_start.get_seconds.return_value = 0.0
        mock_scene_end = Mock()
        mock_scene_end.get_seconds.return_value = 5.0

        mock_detect.return_value = [(mock_scene_start, mock_scene_end)]
        video_utils.temp_video_path = "/tmp/test.mp4"

        video_utils._extract_scenes_from_video()

        assert video_utils.scenes == [(0.0, 5.0)]

    def test_calculate_image_similarity_identical(self, video_utils):
        img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        similarity = video_utils._calculate_image_similarity(img, img)
        assert similarity == pytest.approx(1.0, abs=1e-5)

    def test_calculate_image_similarity_different(self, video_utils):
        img1 = np.zeros((100, 100, 3), dtype=np.uint8)
        img2 = np.ones((100, 100, 3), dtype=np.uint8) * 255
        similarity = video_utils._calculate_image_similarity(img1, img2)
        assert similarity < 1.0

    @patch("utils.video.video_utils.cv2.VideoCapture")
    def test_pick_best_frame_from_scene(
        self, mock_cv2_cap, video_utils, mock_frame_data
    ):
        mock_cap = Mock()
        mock_cv2_cap.return_value = mock_cap
        mock_cap.get.return_value = 30.0

        test_frame = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        mock_cap.read.side_effect = [(True, test_frame)] * 50 + [(False, None)] * 50

        with patch("utils.video.video_utils.cv2.cvtColor") as mock_cvt, patch(
            "utils.video.video_utils.cv2.Laplacian"
        ) as mock_lap, patch(
            "utils.video.video_utils.cv2.imencode",
            return_value=(True, np.frombuffer(mock_frame_data, dtype=np.uint8)),
        ) as mock_imencode, patch(
            "utils.video.video_utils.base64.b64encode"
        ) as mock_b64encode:

            mock_gray = np.zeros((100, 100), dtype=np.uint8)
            mock_cvt.return_value = mock_gray
            mock_laplacian = Mock()
            mock_laplacian.var.return_value = 100.0
            mock_lap.return_value = mock_laplacian

            # Mock the base64 encoding process
            mock_encoded_bytes = Mock()
            mock_encoded_bytes.decode.return_value = "base64_encoded_string"
            mock_b64encode.return_value = mock_encoded_bytes

            video_utils.temp_video_path = "/tmp/test.mp4"
            video_utils.scenes = [(0.0, 1.0)]
            result = video_utils._pick_best_frame_from_scene()

            assert len(result) == 1
            assert isinstance(result[0], Frame)
            assert result[0].data == "base64_encoded_string"  # Verify base64 encoding
            mock_cap.release.assert_called_once()
            mock_b64encode.assert_called()  # Verify base64.b64encode was called

    @patch("utils.video.video_utils.cv2.VideoCapture")
    def test_pick_best_frame_no_valid_frames(self, mock_cv2_cap, video_utils):
        mock_cap = Mock()
        mock_cv2_cap.return_value = mock_cap
        mock_cap.get.return_value = 30.0
        mock_cap.read.return_value = (False, None)

        video_utils.temp_video_path = "/tmp/test.mp4"
        video_utils.scenes = [(0.0, 1.0)]
        result = video_utils._pick_best_frame_from_scene()

        assert result == []
        mock_cap.release.assert_called_once()

    def test_deduplicate_frames_no_duplicates(
        self, video_utils, mock_base64_frame_data, mock_base64_frame_data_different
    ):
        """Test deduplication with non-duplicate base64 frames."""
        frame1 = Frame(data=mock_base64_frame_data, timestamp=1.0)
        frame2 = Frame(data=mock_base64_frame_data_different, timestamp=2.0)

        with patch.object(video_utils, "_calculate_image_similarity", return_value=0.5):
            result = video_utils._deduplicate_frames([frame1, frame2])
            assert len(result) == 2

    def test_deduplicate_frames_with_duplicates(
        self, video_utils, mock_base64_frame_data
    ):
        """Test deduplication with duplicate base64 frames."""
        frame1 = Frame(data=mock_base64_frame_data, timestamp=1.0)
        frame2 = Frame(data=mock_base64_frame_data, timestamp=2.0)  # Same base64 data

        with patch.object(
            video_utils, "_calculate_image_similarity", return_value=0.95
        ):
            result = video_utils._deduplicate_frames([frame1, frame2])
            assert len(result) == 1
            assert result[0].timestamp == 1.0

    def test_deduplicate_frames_base64_decoding(
        self, video_utils, mock_base64_frame_data
    ):
        """Test that frames are properly decoded from base64 during deduplication."""
        frame1 = Frame(data=mock_base64_frame_data, timestamp=1.0)
        frame2 = Frame(data=mock_base64_frame_data, timestamp=2.0)

        with patch("utils.video.video_utils.base64.b64decode") as mock_b64decode, patch(
            "utils.video.video_utils.Image.open"
        ) as mock_image_open, patch.object(
            video_utils, "_calculate_image_similarity", return_value=0.5
        ):

            mock_image = Mock()
            mock_image.convert.return_value = mock_image
            mock_image_open.return_value = mock_image

            mock_b64decode.return_value = b"decoded_image_bytes"

            with patch(
                "utils.video.video_utils.np.array",
                return_value=np.zeros((100, 100, 3), dtype=np.uint8),
            ):
                result = video_utils._deduplicate_frames([frame1, frame2])

                assert mock_b64decode.call_count == 2
                mock_b64decode.assert_any_call(mock_base64_frame_data)

                assert mock_image_open.call_count == 2
                assert mock_image.convert.call_count == 2
                mock_image.convert.assert_called_with("RGB")

    def test_deduplicate_frames_with_custom_threshold(
        self, video_utils, mock_base64_frame_data
    ):
        """Test deduplication with custom similarity threshold."""
        frame1 = Frame(data=mock_base64_frame_data, timestamp=1.0)
        frame2 = Frame(data=mock_base64_frame_data, timestamp=2.0)

        with patch.object(
            video_utils, "_calculate_image_similarity", return_value=0.85
        ):
            result = video_utils._deduplicate_frames([frame1, frame2])
            assert len(result) == 2

            result = video_utils._deduplicate_frames([frame1, frame2], threshold=0.8)
            assert len(result) == 1

    def test_deduplicate_frames_empty_list(self, video_utils):
        result = video_utils._deduplicate_frames([])
        assert result == []

    @patch.object(VideoUtils, "_deduplicate_frames")
    @patch.object(VideoUtils, "_pick_best_frame_from_scene")
    @patch.object(VideoUtils, "_extract_scenes_from_video")
    def test_get_unique_frames_success(
        self, mock_extract, mock_pick, mock_dedup, video_utils, mock_base64_frame_data
    ):
        frame = Frame(data=mock_base64_frame_data, timestamp=1.0)
        mock_pick.return_value = [frame]
        mock_dedup.return_value = [frame]

        with patch.object(
            video_utils.helper_utils, "create_temp_file", return_value="/tmp/test.mp4"
        ), patch.object(video_utils.helper_utils, "cleanup_temp_file"):

            result = video_utils.get_unique_frames()

            assert result == [frame]
            mock_extract.assert_called_once()
            mock_pick.assert_called_once()
            mock_dedup.assert_called_once()

    @patch.object(
        VideoUtils, "_extract_scenes_from_video", side_effect=Exception("Error")
    )
    def test_get_unique_frames_error(self, mock_extract, video_utils):
        with patch.object(
            video_utils.helper_utils, "create_temp_file", return_value="/tmp/test.mp4"
        ), patch.object(video_utils.helper_utils, "cleanup_temp_file"), patch(
            "utils.video.video_utils.logger"
        ):

            result = video_utils.get_unique_frames()
            assert result == []
