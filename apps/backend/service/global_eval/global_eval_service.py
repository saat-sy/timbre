from models.global_config import GlobalConfig
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
        self.video_utils = VideoUtils()
        self.llm_utils = LLMUtils()
        self.helper_utils = HelperUtils()

    def evaluate(self) -> GlobalConfig:
        pass

    def _get_collage_from_video(self, transcript: str) -> any:
        pass

    def _get_transcript_from_video(self) -> str:
        pass
