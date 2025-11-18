import pytest
from unittest.mock import Mock, patch, MagicMock
from utils.llm.llm_utils import LLMUtils
from models.frame import Frame
from models.llm_response import LLMResponse
from models.lyria_config import LyriaConfig
from models.realtime_llm_response import RealtimeLLMResponse


@pytest.fixture
def mock_groq_client():
    """Mock Groq client for testing."""
    mock_client = Mock()
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = "Test response content"
    mock_client.chat.completions.create.return_value = mock_response
    return mock_client


@pytest.fixture
def sample_frames():
    """Sample frames for testing."""
    return [
        Frame(data="base64_encoded_image_1", timestamp=0.0),
        Frame(data="base64_encoded_image_2", timestamp=1.0),
        Frame(data="base64_encoded_image_3", timestamp=2.0),
    ]


@pytest.fixture
def sample_transcript():
    """Sample transcript for testing."""
    return [
        {"text": "Hello world", "start": 0.0, "end": 1.0},
        {"text": "This is a test", "start": 1.0, "end": 3.0},
    ]


@pytest.fixture
def sample_global_context():
    """Sample global context for testing."""
    return {
        "mood": "energetic",
        "theme": "action",
        "instruments": ["guitar", "drums"]
    }


class TestLLMUtils:

    @patch.dict("os.environ", {"GROQ_API_KEY": "test_api_key"})
    @patch("utils.llm.llm_utils.Groq")
    def test_init_with_history(self, mock_groq):
        """Test LLMUtils initialization with history enabled."""
        llm_utils = LLMUtils(history=True)
        
        assert llm_utils.client is not None
        assert llm_utils.history is not None
        mock_groq.assert_called_once_with(api_key="test_api_key")

    @patch.dict("os.environ", {"GROQ_API_KEY": "test_api_key"})
    @patch("utils.llm.llm_utils.Groq")
    def test_init_without_history(self, mock_groq):
        """Test LLMUtils initialization without history."""
        llm_utils = LLMUtils(history=False)
        
        assert llm_utils.client is not None
        assert llm_utils.history is None
        mock_groq.assert_called_once_with(api_key="test_api_key")

    @patch.dict("os.environ", {}, clear=True)
    def test_init_missing_api_key(self):
        """Test LLMUtils initialization fails when API key is missing."""
        with pytest.raises(ValueError, match="GROQ_API_KEY environment variable is required"):
            LLMUtils()

    @patch.dict("os.environ", {"GROQ_API_KEY": "test_api_key"})
    @patch("utils.llm.llm_utils.Groq")
    @patch("utils.llm.llm_utils.LLMValidators")
    @patch("utils.llm.llm_utils.Prompts")
    def test_get_global_config_success(self, mock_prompts, mock_validators, mock_groq, 
                                      sample_transcript, sample_frames, mock_groq_client):
        """Test successful global config generation."""
        mock_groq.return_value = mock_groq_client
        mock_validators.validate_transcript.return_value = None
        mock_validators.validate_frames.return_value = None
        mock_validators.chunk_frames.return_value = [sample_frames]  # Single chunk
        mock_validators.make_api_call_with_retry.return_value = mock_groq_client.chat.completions.create.return_value
        
        mock_llm_response = LLMResponse(
            lyria_config=LyriaConfig(prompt="test", bpm=120, scale="MAJOR", weight=1.0),
            context="test context",
            transcription="test transcription"
        )
        mock_validators.parse_llm_response.return_value = mock_llm_response
        mock_prompts.get_global_context_prompt.return_value = "system prompt"

        llm_utils = LLMUtils()
        result = llm_utils.get_global_config(sample_transcript, sample_frames)

        assert isinstance(result, LLMResponse)
        assert result.lyria_config.prompt == "test"
        mock_validators.validate_transcript.assert_called_once_with(sample_transcript)
        mock_validators.validate_frames.assert_called_once_with(sample_frames)

    @patch.dict("os.environ", {"GROQ_API_KEY": "test_api_key"})
    @patch("utils.llm.llm_utils.Groq")
    @patch("utils.llm.llm_utils.LLMValidators")
    def test_get_global_config_error_fallback(self, mock_validators, mock_groq, 
                                            sample_transcript, sample_frames):
        """Test global config falls back to default when error occurs."""
        # Setup mocks to raise an exception
        mock_validators.validate_transcript.side_effect = Exception("Validation failed")

        llm_utils = LLMUtils()
        result = llm_utils.get_global_config(sample_transcript, sample_frames)

        assert isinstance(result, LLMResponse)
        assert result.lyria_config.prompt == "Ambient, neutral background music"
        assert result.lyria_config.bpm == 120
        assert "Default configuration due to error" in result.context

    @patch.dict("os.environ", {"GROQ_API_KEY": "test_api_key"})
    @patch("utils.llm.llm_utils.Groq")
    @patch("utils.llm.llm_utils.LLMValidators")
    @patch("utils.llm.llm_utils.Prompts")
    def test_get_realtime_config_success(self, mock_prompts, mock_validators, mock_groq,
                                       sample_transcript, sample_frames, sample_global_context, 
                                       mock_groq_client):
        """Test successful realtime config generation."""
        mock_groq.return_value = mock_groq_client
        mock_validators.validate_duration.return_value = None
        mock_validators.validate_transcript.return_value = None
        mock_validators.validate_frames.return_value = None
        mock_validators.make_api_call_with_retry.return_value = mock_groq_client.chat.completions.create.return_value
        
        mock_realtime_response = RealtimeLLMResponse(
            lyria_config=LyriaConfig(prompt="test", bpm=140, scale="MINOR", weight=0.8),
            context="realtime context",
            change_music=True,
            change_music_at=5
        )
        mock_validators.parse_realtime_llm_response.return_value = mock_realtime_response
        mock_prompts.get_realtime_context_prompt.return_value = {"role": "system", "content": "system prompt"}
        mock_prompts.get_realtime_segment_prompt.return_value = "segment prompt"

        llm_utils = LLMUtils(history=True)
        result = llm_utils.get_realtime_config(
            duration_start=0.0,
            duration_end=10.0,
            global_context=sample_global_context,
            transcript=sample_transcript,
            frames=sample_frames
        )

        assert isinstance(result, RealtimeLLMResponse)
        assert result.lyria_config is not None
        assert result.lyria_config.prompt == "test"
        assert result.change_music is True
        mock_validators.validate_duration.assert_called_once_with(0.0, 10.0)

    @patch.dict("os.environ", {"GROQ_API_KEY": "test_api_key"})
    @patch("utils.llm.llm_utils.Groq")
    @patch("utils.llm.llm_utils.LLMValidators")
    def test_get_realtime_config_with_invalid_global_context(self, mock_validators, mock_groq,
                                                           sample_transcript, sample_frames):
        """Test realtime config handles invalid global context."""
        mock_validators.validate_duration.return_value = None
        mock_validators.validate_transcript.return_value = None
        mock_validators.validate_frames.return_value = None
        mock_validators.make_api_call_with_retry.side_effect = Exception("API Error")

        llm_utils = LLMUtils()
        result = llm_utils.get_realtime_config(
            duration_start=0.0,
            duration_end=10.0,
            global_context={},  # Empty dict instead of None
            transcript=sample_transcript,
            frames=sample_frames
        )

        # Should return default response due to error
        assert isinstance(result, RealtimeLLMResponse)
        assert result.lyria_config is None
        assert result.change_music is False
        assert "Default real-time configuration due to error" in result.context

    @patch.dict("os.environ", {"GROQ_API_KEY": "test_api_key"})
    @patch("utils.llm.llm_utils.Groq")
    @patch("utils.llm.llm_utils.LLMValidators")
    @patch("utils.llm.llm_utils.Prompts")
    def test_get_realtime_config_with_too_many_frames(self, mock_prompts, mock_validators, mock_groq,
                                                     sample_transcript, mock_groq_client):
        """Test realtime config limits frames to MAX_FRAMES_PER_REQUEST."""
        # Create more frames than the limit
        many_frames = [
            Frame(data=f"base64_image_{i}", timestamp=float(i)) 
            for i in range(10)
        ]
        
        # Setup mocks
        mock_groq.return_value = mock_groq_client
        mock_validators.validate_duration.return_value = None
        mock_validators.validate_transcript.return_value = None
        mock_validators.validate_frames.return_value = None
        mock_validators.make_api_call_with_retry.return_value = mock_groq_client.chat.completions.create.return_value
        
        mock_realtime_response = RealtimeLLMResponse(
            lyria_config=None,
            context="test context",
            change_music=False,
            change_music_at=None
        )
        mock_validators.parse_realtime_llm_response.return_value = mock_realtime_response
        mock_prompts.get_realtime_context_prompt.return_value = {"role": "system", "content": "system prompt"}
        mock_prompts.get_realtime_segment_prompt.return_value = "segment prompt"

        llm_utils = LLMUtils(history=True)
        result = llm_utils.get_realtime_config(
            duration_start=0.0,
            duration_end=10.0,
            global_context={},
            transcript=sample_transcript,
            frames=many_frames
        )

        assert isinstance(result, RealtimeLLMResponse)
        # The function should have processed only MAX_FRAMES_PER_REQUEST frames
        mock_validators.make_api_call_with_retry.assert_called_once()

    @patch.dict("os.environ", {"GROQ_API_KEY": "test_api_key"})
    @patch("utils.llm.llm_utils.Groq")
    @patch("utils.llm.llm_utils.LLMValidators")
    def test_get_realtime_config_error_fallback(self, mock_validators, mock_groq,
                                              sample_transcript, sample_frames):
        """Test realtime config falls back to default when error occurs."""
        # Setup mocks to raise an exception
        mock_validators.validate_duration.side_effect = Exception("Validation failed")

        llm_utils = LLMUtils()
        result = llm_utils.get_realtime_config(
            duration_start=0.0,
            duration_end=10.0,
            global_context={},
            transcript=sample_transcript,
            frames=sample_frames
        )

        assert isinstance(result, RealtimeLLMResponse)
        assert result.lyria_config is None
        assert result.change_music is False
        assert "Default real-time configuration due to error" in result.context

    @patch.dict("os.environ", {"GROQ_API_KEY": "test_api_key", "GROQ_VISION_MODEL": "custom-model"})
    @patch("utils.llm.llm_utils.Groq")
    def test_custom_vision_model(self, mock_groq):
        """Test that custom vision model from environment is used."""
        llm_utils = LLMUtils()
        assert llm_utils.vision_model == "custom-model"

    @patch.dict("os.environ", {"GROQ_API_KEY": "test_api_key"})
    @patch("utils.llm.llm_utils.Groq")
    def test_default_vision_model(self, mock_groq):
        """Test that default vision model is used when not specified."""
        llm_utils = LLMUtils()
        assert llm_utils.vision_model == "meta-llama/llama-4-scout-17b-16e-instruct"

    def test_constants(self):
        """Test that class constants are properly defined."""
        assert LLMUtils.API_TIMEOUT == 60
        assert LLMUtils.MAX_RETRIES == 3
        assert LLMUtils.RETRY_DELAY == 2
        assert LLMUtils.MAX_FRAMES_PER_REQUEST == 5