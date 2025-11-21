import os
import json
import tempfile
import subprocess
from dotenv import load_dotenv
from groq import Groq
from shared.logging import get_logger
from utils.helper.helper_utils import HelperUtils

logger = get_logger(__name__)
load_dotenv()


class AudioUtils:
    def __init__(self) -> None:
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.whisper_model = os.getenv("WHISPER_MODEL", "whisper-large-v3-turbo")
        self.helper_utils = HelperUtils()

    def _convert_video_to_audio(self, video_bytes: bytes) -> bytes:
        video_path = self.helper_utils.create_temp_file(video_bytes)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as audio_file:
            audio_path = audio_file.name

        logger.info("Converting video to audio using FFmpeg")

        try:
            _ = subprocess.run(
                [
                    "ffmpeg",
                    "-i",
                    video_path,
                    "-ar",
                    "16000",
                    "-ac",
                    "1",
                    "-c:a",
                    "pcm_s16le",
                    audio_path,
                    "-y",
                ],
                check=True,
                capture_output=True,
            )

            with open(audio_path, "rb") as f:
                audio_bytes = f.read()

            logger.info("Audio conversion successful")

            return audio_bytes

        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg failed: {e.stderr.decode()}")
            raise
        except FileNotFoundError:
            logger.error("FFmpeg not found. Please install ffmpeg.")
            raise
        except Exception as e:
            logger.error(f"Error converting video to audio: {str(e)}")
            raise
        finally:
            self.helper_utils.cleanup_temp_file(video_path)
            if os.path.exists(audio_path):
                os.unlink(audio_path)

    def get_transcription(self, video_bytes: bytes) -> list:
        try:
            audio_bytes = self._convert_video_to_audio(video_bytes)

            transcription = self.client.audio.transcriptions.create(
                file=("audio.wav", audio_bytes),
                model=self.whisper_model,
                response_format="verbose_json",
            )

            if hasattr(transcription, "model_dump"):
                result = transcription.model_dump()
            else:
                result = {"text": transcription.text}

            return self._change_transcription_format(result)
        except Exception as e:
            logger.error(f"Transcription failed: {str(e)}")
            return []

    def _change_transcription_format(self, transcription: dict) -> list:
        formatted = []

        for segment in transcription.get("segments", []):
            try:
                text = segment.get("text", "").strip()
                start = segment.get("start")
                end = segment.get("end")

                if (
                    not text
                    or not isinstance(start, (int, float))
                    or not isinstance(end, (int, float))
                ):
                    continue

                formatted.append(
                    {"text": text, "timestamp": f"{round(start, 2)} - {round(end, 2)}"}
                )

            except Exception as e:
                logger.warning(f"Skipping segment: {e}")
                continue

        return json.loads(json.dumps(formatted))

if __name__ == "__main__":
    import time

    start_time = time.time()
    audio_utils = AudioUtils()

    with open("test.mp4", "rb") as f:
        video_bytes = f.read()

    transcription = audio_utils.get_transcription(video_bytes)
    end_time = time.time()
    logger.info(f"Transcription completed in {end_time - start_time:.2f} seconds")
    logger.info(f"Transcription: {transcription}")
