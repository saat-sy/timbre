import pytest
import os
import subprocess
from unittest.mock import Mock, patch, mock_open
from utils.audio.audio_utils import AudioUtils


@pytest.fixture
def mock_video_bytes():
    return b"fake_video_data"


@pytest.fixture
def audio_utils():
    with patch.dict(os.environ, {"GROQ_API_KEY": "test_key"}):
        return AudioUtils()


class TestAudioUtils:

    @patch("utils.audio.audio_utils.Groq")
    def test_init(self, mock_groq):
        with patch.dict(
            os.environ, {"GROQ_API_KEY": "test_key", "WHISPER_MODEL": "test-model"}
        ):
            audio_utils = AudioUtils()
            assert audio_utils.whisper_model == "test-model"
            mock_groq.assert_called_once_with(api_key="test_key")

    @patch("utils.audio.audio_utils.subprocess.run")
    @patch("utils.audio.audio_utils.tempfile.NamedTemporaryFile")
    @patch("builtins.open", new_callable=mock_open, read_data=b"audio_data")
    def test_convert_video_to_audio(
        self, mock_file, mock_tempfile, mock_subprocess, audio_utils, mock_video_bytes
    ):
        mock_temp_audio = Mock()
        mock_temp_audio.name = "/tmp/test.wav"
        mock_tempfile.return_value.__enter__.return_value = mock_temp_audio
        mock_subprocess.return_value = Mock(returncode=0)

        with patch.object(
            audio_utils.helper_utils, "create_temp_file", return_value="/tmp/test.mp4"
        ), patch.object(audio_utils.helper_utils, "cleanup_temp_file"), patch(
            "utils.audio.audio_utils.os.path.exists", return_value=True
        ), patch(
            "utils.audio.audio_utils.os.unlink"
        ):

            result = audio_utils._convert_video_to_audio(mock_video_bytes)
            assert result == b"audio_data"

    @patch("utils.audio.audio_utils.subprocess.run")
    @patch("utils.audio.audio_utils.tempfile.NamedTemporaryFile")
    def test_convert_video_to_audio_error(
        self, mock_tempfile, mock_subprocess, audio_utils, mock_video_bytes
    ):
        mock_temp_audio = Mock()
        mock_temp_audio.name = "/tmp/test.wav"
        mock_tempfile.return_value.__enter__.return_value = mock_temp_audio

        error = subprocess.CalledProcessError(1, "ffmpeg")
        error.stderr = b"FFmpeg error"
        mock_subprocess.side_effect = error

        with patch.object(audio_utils.helper_utils, "create_temp_file"), patch.object(
            audio_utils.helper_utils, "cleanup_temp_file"
        ), patch("utils.audio.audio_utils.os.path.exists", return_value=True), patch(
            "utils.audio.audio_utils.os.unlink"
        ):

            with pytest.raises(subprocess.CalledProcessError):
                audio_utils._convert_video_to_audio(mock_video_bytes)

    def test_get_transcription(self, audio_utils, mock_video_bytes):
        mock_transcription = Mock()
        mock_transcription.model_dump.return_value = {
            "segments": [{"text": "Hello world", "start": 0.0, "end": 2.0}]
        }

        with patch.object(
            audio_utils, "_convert_video_to_audio", return_value=b"audio"
        ), patch.object(
            audio_utils.client.audio.transcriptions,
            "create",
            return_value=mock_transcription,
        ):

            result = audio_utils.get_transcription(mock_video_bytes)
            expected = [{"text": "Hello world", "timestamp": "0.0 - 2.0"}]
            assert result == expected

    def test_get_transcription_error(self, audio_utils, mock_video_bytes):
        with patch.object(
            audio_utils, "_convert_video_to_audio", side_effect=Exception("Error")
        ), patch("utils.audio.audio_utils.logger"):

            result = audio_utils.get_transcription(mock_video_bytes)
            assert result == []

    def test_change_transcription_format(self, audio_utils):
        transcription_data = {
            "segments": [
                {"text": "First segment", "start": 0.0, "end": 2.5},
                {"text": "Second segment", "start": 2.5, "end": 5.0},
            ]
        }

        result = audio_utils._change_transcription_format(transcription_data)
        expected = [
            {"text": "First segment", "timestamp": "0.0 - 2.5"},
            {"text": "Second segment", "timestamp": "2.5 - 5.0"},
        ]
        assert result == expected

    def test_change_transcription_format_empty(self, audio_utils):
        result = audio_utils._change_transcription_format({"segments": []})
        assert result == []

    def test_change_transcription_format_invalid_segment(self, audio_utils):
        transcription_data = {
            "segments": [
                {"text": "Valid", "start": 0.0, "end": 2.0},
                {"text": "", "start": 2.0, "end": 3.0},
                {"start": 3.0, "end": 4.0},
            ]
        }

        result = audio_utils._change_transcription_format(transcription_data)
        assert len(result) == 1
        assert result[0]["text"] == "Valid"
