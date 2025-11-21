import json
import time
import base64
from google.genai import types
from groq.types.chat import ChatCompletion
from typing import Dict, List
from models.frame import Frame
from models.lyria_config import LyriaConfig
from models.llm_response import LLMResponse
from models.realtime_llm_response import RealtimeLLMResponse, Analysis
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
    def parse_realtime_llm_response(response: ChatCompletion) -> RealtimeLLMResponse:
        try:
            logger.info("Parsing real-time configuration response from LLM.")
            content = response.choices[0].message.content
            if content:
                config_data = json.loads(content)

                analysis_data = config_data.get("analysis", {})
                analysis = Analysis(
                    plan_instruction=analysis_data.get("plan_instruction", ""),
                    reality_check=analysis_data.get("reality_check", ""),
                    decision=analysis_data.get("decision", ""),
                )

                change_music = config_data.get("change_music", False)
                change_music_at = config_data.get("change_music_at", None)

                if change_music_at is not None:
                    if not isinstance(change_music_at, (int, float)):
                        logger.warning(
                            f"Invalid change_music_at type: {type(change_music_at)}. Converting to float."
                        )
                        try:
                            change_music_at = float(change_music_at)
                        except (ValueError, TypeError):
                            logger.error(
                                f"Cannot convert change_music_at to float: {change_music_at}"
                            )
                            change_music_at = None
                    else:
                        change_music_at = float(change_music_at)

                lyria_config_data = config_data.get("lyria_config", None)
                lyria_config_obj = None

                if lyria_config_data:
                    lyria_config_obj = LLMValidators.create_lyria_config(
                        lyria_config_data
                    )

                return RealtimeLLMResponse(
                    analysis=analysis,
                    change_music=change_music,
                    change_music_at=change_music_at,
                    lyria_config=lyria_config_obj,
                )
            else:
                raise ValueError("No content in LLM response.")
        except Exception as e:
            logger.error(
                f"Unexpected error: {e}. Using default real-time configuration."
            )
            default_analysis = Analysis(
                plan_instruction="Default analysis due to unexpected error",
                reality_check="Default analysis due to unexpected error",
                decision="Default analysis due to unexpected error",
            )
            return RealtimeLLMResponse(
                analysis=default_analysis,
                change_music=False,
                change_music_at=None,
                lyria_config=None,
            )

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
