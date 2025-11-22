import json
import time
import base64
from google.genai import types
from groq.types.chat import ChatCompletion
from typing import Dict, List
from models.frame import Frame
from models.lyria_config import LyriaConfig
from models.llm_response import LLMResponse, MasterPlan
from shared.logging import get_logger

logger = get_logger(__name__)


class LLMValidators:
    @staticmethod
    def validate_frames(frames: List[Frame]) -> None:
        if not frames:
            raise ValueError("Frames list cannot be empty")

        for i, frame in enumerate(frames):
            if not hasattr(frame, "data") or not frame.data:
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
        required_lyria_fields = ["prompt", "bpm", "scale", "weight"]
        for field in required_lyria_fields:
            if field not in lyria_config_data:
                raise ValueError(f"Missing '{field}' in lyria_config")

        bpm = lyria_config_data["bpm"]
        if not isinstance(bpm, int) or not (60 <= bpm <= 200):
            raise ValueError("BPM must be an integer between 60 and 200")

        scale = lyria_config_data["scale"]
        if scale not in [scale.name for scale in types.Scale]:
            logger.warning(f"Invalid scale '{scale}', defaulting to SCALE_UNSPECIFIED")
            lyria_config_data["scale"] = types.Scale.SCALE_UNSPECIFIED.name

        weight = lyria_config_data["weight"]
        if not isinstance(weight, (int, float)) or weight <= 0:
            raise ValueError("Weight must be a positive number")

        prompt = lyria_config_data["prompt"]
        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError("Prompt must be a non-empty string")

    @staticmethod
    def create_lyria_config(lyria_config_data: dict) -> LyriaConfig:
        LLMValidators.validate_lyria_config_data(lyria_config_data)
        return LyriaConfig(
            prompt=lyria_config_data["prompt"],
            bpm=lyria_config_data["bpm"],
            scale=lyria_config_data["scale"],
            weight=lyria_config_data["weight"],
        )

    @staticmethod
    def make_api_call_with_retry(
        client, max_retries: int, retry_delay: int, api_timeout: int, **kwargs
    ) -> ChatCompletion:
        last_exception = None

        for attempt in range(max_retries):
            try:
                kwargs["timeout"] = api_timeout

                response = client.chat.completions.create(**kwargs)

                if not response or not response.choices or not response.choices[0]:
                    raise ValueError("Invalid response structure from API")

                if (
                    not response.choices[0].message
                    or not response.choices[0].message.content
                ):
                    raise ValueError("No content in API response")

                return response

            except Exception as e:
                last_exception = e
                logger.warning(f"API call attempt {attempt + 1} failed: {e}")

                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (attempt + 1))
                else:
                    logger.error(f"All {max_retries} API call attempts failed")

        raise (
            last_exception
            if last_exception
            else Exception("API call failed after all retries")
        )

    @staticmethod
    def parse_scene_analysis(
        response: ChatCompletion, chunk: List[Frame]
    ) -> List[dict]:
        try:
            logger.info("Parsing scene analysis response from LLM.")
            content = response.choices[0].message.content
            if content:
                data = json.loads(content)
                scene_analysis = data.get("scene_analysis", [])

                if not isinstance(scene_analysis, list):
                    raise ValueError("scene_analysis must be a list")

                for i, scene in enumerate(scene_analysis):
                    if not isinstance(scene, dict):
                        raise ValueError(f"Scene {i} must be a dictionary")

                    required_fields = ["description", "mood", "keywords"]
                    for field in required_fields:
                        if field not in scene:
                            raise ValueError(
                                f"Scene {i} missing required field: {field}"
                            )

                    if not isinstance(scene["keywords"], list):
                        raise ValueError(f"Scene {i} keywords must be a list")

                    if i < len(chunk):
                        frame = chunk[i]
                        scene["timestamp"] = round(frame.timestamp, 2)
                        scene["start_time"] = round(frame.scene_start, 2)
                        scene["end_time"] = round(frame.scene_end, 2)
                        logger.debug(
                            f"Scene {i}: Integrated timestamp={frame.timestamp:.2f}s, scene_start={frame.scene_start:.2f}s, scene_end={frame.scene_end:.2f}s"
                        )
                    else:
                        scene["timestamp"] = scene.get("timestamp", 0.0)
                        scene["start_time"] = scene.get("start_time", 0.0)
                        scene["end_time"] = scene.get("end_time", 0.0)
                        logger.warning(
                            f"Scene {i}: No corresponding frame found, using default/existing timestamps"
                        )

                return scene_analysis
            else:
                raise ValueError("No content in LLM response.")
        except Exception as e:
            logger.error(f"Error parsing scene analysis: {e}")
            return []

    @staticmethod
    def chunk_frames(frames: List[Frame], chunk_size: int) -> List[List[Frame]]:
        chunks = []
        for i in range(0, len(frames), chunk_size):
            chunks.append(frames[i : i + chunk_size])
        return chunks

    @staticmethod
    def extract_transcription_for_scene(
        transcript: List[Dict], scene_start: float, scene_end: float
    ) -> List[dict]:
        if not transcript:
            return []

        filtered_transcript = []

        for entry in transcript:
            if "timestamp" not in entry:
                continue

            timestamp = entry["timestamp"]

            try:
                if " - " in timestamp:
                    start_str, end_str = timestamp.split(" - ")
                    entry_start = float(start_str)
                    entry_end = float(end_str)
                else:
                    entry_start = float(timestamp)
                    entry_end = entry_start

                if entry_start < scene_end and entry_end > scene_start:
                    filtered_transcript.append(entry)

            except (ValueError, TypeError) as e:
                logger.warning(f"Could not parse timestamp '{timestamp}': {e}")
                continue

        return filtered_transcript
    
    @staticmethod
    def validate_master_plan_response(content: str) -> MasterPlan:
        try:
            logger.info("Parsing master plan response from LLM.")
            data = json.loads(content)
            
            if "global_context" not in data:
                raise ValueError("Missing 'global_context' in master plan response")
            
            if "musical_blocks" not in data:
                raise ValueError("Missing 'musical_blocks' in master plan response")
            
            global_context = data["global_context"]
            if not isinstance(global_context, str) or not global_context.strip():
                raise ValueError("global_context must be a non-empty string")
            
            music_blocks_data = data["musical_blocks"]
            if not isinstance(music_blocks_data, list):
                raise ValueError("musical_blocks must be a list")
            
            music_blocks = []
            for i, block_data in enumerate(music_blocks_data):
                if not isinstance(block_data, dict):
                    raise ValueError(f"Music block {i} must be a dictionary")
                
                required_block_fields = ["time_range", "musical_direction", "transition", "lyria_config"]
                for field in required_block_fields:
                    if field not in block_data:
                        raise ValueError(f"Music block {i} missing required field: {field}")
                
                time_range = block_data["time_range"]
                if not isinstance(time_range, dict):
                    raise ValueError(f"Music block {i} time_range must be a dictionary")
                
                if "start" not in time_range or "end" not in time_range:
                    raise ValueError(f"Music block {i} time_range must have 'start' and 'end' fields")
                
                try:
                    start = float(time_range["start"])
                    end = float(time_range["end"])
                    LLMValidators.validate_duration(start, end)
                    time_range = {"start": start, "end": end}
                except (ValueError, TypeError) as e:
                    raise ValueError(f"Music block {i} has invalid time_range: {e}")
                
                musical_direction = block_data["musical_direction"]
                if not isinstance(musical_direction, str) or not musical_direction.strip():
                    raise ValueError(f"Music block {i} musical_direction must be a non-empty string")
                
                transition = block_data["transition"]
                if not isinstance(transition, str) or not transition.strip():
                    raise ValueError(f"Music block {i} transition must be a non-empty string")
                
                lyria_config_data = block_data["lyria_config"]
                if not isinstance(lyria_config_data, dict):
                    raise ValueError(f"Music block {i} lyria_config must be a dictionary")
                
                lyria_config = LLMValidators.create_lyria_config(lyria_config_data)
                
                from models.llm_response import MusicBlocks
                music_block = MusicBlocks(
                    time_range=time_range,
                    musical_direction=musical_direction,
                    transition=transition,
                    lyria_config=lyria_config
                )
                music_blocks.append(music_block)
            
            return MasterPlan(
                global_context=global_context,
                musical_blocks=music_blocks
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in master plan response: {e}")
            raise ValueError(f"Invalid JSON format in master plan response: {e}")
        except Exception as e:
            logger.error(f"Error validating master plan response: {e}")
            raise ValueError(f"Error parsing master plan response: {e}")

