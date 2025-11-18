import json
import time
import base64
from google.genai import types
from groq.types.chat import ChatCompletion
from typing import List
from models.frame import Frame
from models.lyria_config import LyriaConfig
from models.llm_response import LLMResponse
from models.realtime_llm_response import RealtimeLLMResponse
from shared.logging import get_logger

logger = get_logger(__name__)


class LLMValidators:
    @staticmethod
    def validate_frames(frames: List[Frame]) -> None:
        if not frames:
            raise ValueError("Frames list cannot be empty")
        
        for i, frame in enumerate(frames):
            if not hasattr(frame, 'data') or not frame.data:
                raise ValueError(f"Frame {i} has no data")
            
            try:
                base64.b64decode(frame.data, validate=True)
            except Exception as e:
                raise ValueError(f"Frame {i} has invalid base64 data: {e}")

    @staticmethod
    def validate_transcript(transcript) -> None:
        if transcript is None:
            raise ValueError("Transcript cannot be None")

    @staticmethod
    def validate_duration(start: float, end: float) -> None:
        if start < 0:
            raise ValueError(f"Duration start must be non-negative, got: {start}")
        if end < 0:
            raise ValueError(f"Duration end must be non-negative, got: {end}")
        if start >= end:
            raise ValueError(f"Start time ({start}) must be before end time ({end})")

    @staticmethod
    def validate_lyria_config_data(lyria_config_data: dict) -> None:
        required_lyria_fields = ['prompt', 'bpm', 'scale', 'weight']
        for field in required_lyria_fields:
            if field not in lyria_config_data:
                raise ValueError(f"Missing '{field}' in lyria_config")

        bpm = lyria_config_data['bpm']
        if not isinstance(bpm, int) or not (60 <= bpm <= 200):
            raise ValueError("BPM must be an integer between 60 and 200")
        
        scale = lyria_config_data['scale']
        if scale not in [scale.name for scale in types.Scale]:
            logger.warning(f"Invalid scale '{scale}', defaulting to SCALE_UNSPECIFIED")
            lyria_config_data['scale'] = types.Scale.SCALE_UNSPECIFIED.name
        
        weight = lyria_config_data['weight']
        if not isinstance(weight, (int, float)) or weight <= 0:
            raise ValueError("Weight must be a positive number")
        
        prompt = lyria_config_data['prompt']
        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError("Prompt must be a non-empty string")

    @staticmethod
    def create_lyria_config(lyria_config_data: dict) -> LyriaConfig:
        LLMValidators.validate_lyria_config_data(lyria_config_data)
        return LyriaConfig(
            prompt=lyria_config_data['prompt'],
            bpm=lyria_config_data['bpm'],
            scale=lyria_config_data['scale'],
            weight=lyria_config_data['weight']
        )

    @staticmethod
    def make_api_call_with_retry(client, max_retries: int, retry_delay: int, api_timeout: int, **kwargs) -> ChatCompletion:
        last_exception = None
        
        for attempt in range(max_retries):
            try:
                kwargs['timeout'] = api_timeout
                
                response = client.chat.completions.create(**kwargs)
                
                if not response or not response.choices or not response.choices[0]:
                    raise ValueError("Invalid response structure from API")
                
                if not response.choices[0].message or not response.choices[0].message.content:
                    raise ValueError("No content in API response")
                
                return response
                
            except Exception as e:
                last_exception = e
                logger.warning(f"API call attempt {attempt + 1} failed: {e}")
                
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (attempt + 1))
                else:
                    logger.error(f"All {max_retries} API call attempts failed")
        
        raise last_exception if last_exception else Exception("API call failed after all retries")

    @staticmethod
    def parse_llm_response(response: ChatCompletion, transcript: List) -> LLMResponse:
        try:
            logger.info("Parsing global configuration response from LLM.")
            content = response.choices[0].message.content
            if content:
                config_data = json.loads(content)
                if 'lyria_config' not in config_data:
                    raise ValueError("Missing 'lyria_config' in LLM response")

                if 'transcription' not in config_data:
                    config_data['transcription'] = transcript

                context = config_data.get('context', '')
                if context and (not isinstance(context, str) or not context.strip()):
                    raise ValueError("Context must be a non-empty string when provided")
                
                lyria_config_obj = LLMValidators.create_lyria_config(config_data['lyria_config'])
                
                return LLMResponse(
                    lyria_config=lyria_config_obj,
                    context=config_data.get('context', ''),
                    transcription=config_data['transcription']
                )
            else:
                raise ValueError("No content in LLM response.")
        except Exception as e:
            logger.error(f"Unexpected error: {e}. Using default configuration.")
            default_lyria = LyriaConfig(
                prompt="Ambient, neutral background music",
                bpm=120,
                scale=types.Scale.SCALE_UNSPECIFIED.name,
                weight=1.0
            )
            return LLMResponse(
                lyria_config=default_lyria,
                context="Default configuration due to unexpected error",
                transcription=str(transcript)
            )

    @staticmethod
    def parse_realtime_llm_response(response: ChatCompletion) -> RealtimeLLMResponse:
        try:
            logger.info("Parsing real-time configuration response from LLM.")
            content = response.choices[0].message.content
            if content:
                config_data = json.loads(content)

                change_music = config_data.get('change_music', False)
                change_music_at = config_data.get('change_music_at', None)
                
                if change_music_at is not None:
                    if not isinstance(change_music_at, (int, float)):
                        logger.warning(f"Invalid change_music_at type: {type(change_music_at)}. Converting to int.")
                        try:
                            change_music_at = int(float(change_music_at))
                        except (ValueError, TypeError):
                            logger.error(f"Cannot convert change_music_at to int: {change_music_at}")
                            change_music_at = None
                    else:
                        change_music_at = int(change_music_at)

                lyria_config_data = config_data.get('lyria_config', None)
                lyria_config_obj = None

                if lyria_config_data:
                    lyria_config_obj = LLMValidators.create_lyria_config(lyria_config_data)

                return RealtimeLLMResponse(
                    lyria_config=lyria_config_obj,
                    context=config_data.get('context', ''),
                    change_music=change_music,
                    change_music_at=change_music_at
                )
            else:
                raise ValueError("No content in LLM response.")
        except Exception as e:
            logger.error(f"Unexpected error: {e}. Using default real-time configuration.")
            return RealtimeLLMResponse(
                lyria_config=None,
                context="Default real-time configuration due to unexpected error",
                change_music=False,
                change_music_at=None
            )
    
    @staticmethod
    def chunk_frames(frames: List[Frame], chunk_size: int) -> List[List[Frame]]:
        chunks = []
        for i in range(0, len(frames), chunk_size):
            chunks.append(frames[i:i + chunk_size])
        return chunks