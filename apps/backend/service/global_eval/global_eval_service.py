from models.llm_response import LLMResponse
from shared.logging import get_logger
from utils.audio.audio_utils import AudioUtils
from utils.helper.helper_utils import HelperUtils
from utils.llm.llm_utils import LLMUtils
from utils.video.video_utils import VideoUtils

logger = get_logger(__name__)


class GlobalEvalService:
    def __init__(self, video: bytes) -> None:
        self.video = video
        self.audio_utils = AudioUtils()
        self.video_utils = VideoUtils(video=video)
        self.llm_utils = LLMUtils()
        self.helper_utils = HelperUtils()

    def evaluate(self) -> LLMResponse:
        try:
            logger.info("Starting global evaluation of the video.")

            transcriptions = self.audio_utils.get_transcription(video_bytes=self.video)

            frames = self.video_utils.get_unique_frames()

            response = self.llm_utils.get_global_config(transcript=transcriptions, frames=frames)

            logger.info("Global evaluation completed.")
            
            return response
        except Exception as e:
            logger.error(f"Error during global evaluation: {e}")
            raise e