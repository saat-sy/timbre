import pytest
from unittest.mock import Mock, patch, mock_open
from utils.helper.helper_utils import HelperUtils


@pytest.fixture
def helper_utils():
    return HelperUtils()


@pytest.fixture
def mock_video_bytes():
    return b"fake_video_data"


class TestHelperUtils:
    
    def test_init(self):
        helper_utils = HelperUtils()
        assert isinstance(helper_utils, HelperUtils)

    @patch('builtins.open', new_callable=mock_open)
    @patch('utils.helper.helper_utils.time.time', return_value=1234567890.123)
    def test_create_temp_file(self, mock_time, mock_file, helper_utils, mock_video_bytes):
        result = helper_utils.create_temp_file(mock_video_bytes)
        
        expected_path = "/tmp/temp_video_1234567890123.mp4"
        assert result == expected_path
        mock_file.assert_called_once_with(expected_path, "wb")
        mock_file().write.assert_called_once_with(mock_video_bytes)

    @patch('utils.helper.helper_utils.os.remove')
    def test_cleanup_temp_file(self, mock_remove, helper_utils):
        test_path = "/tmp/test_video.mp4"
        helper_utils.cleanup_temp_file(test_path)
        mock_remove.assert_called_once_with(test_path)

    @patch('utils.helper.helper_utils.os.remove', side_effect=FileNotFoundError())
    @patch('utils.helper.helper_utils.logger')
    def test_cleanup_temp_file_error(self, mock_logger, mock_remove, helper_utils):
        test_path = "/tmp/test_video.mp4"
        helper_utils.cleanup_temp_file(test_path)
        mock_remove.assert_called_once_with(test_path)
        mock_logger.error.assert_called_once()