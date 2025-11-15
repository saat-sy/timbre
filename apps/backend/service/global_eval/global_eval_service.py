from models.global_config import GlobalConfig
from shared.logging import get_logger

logger = get_logger(__name__)


class GlobalEvalService:
    def __init__(self, video: bytes) -> None:
        self.video = video

    def evaluate(self) -> GlobalConfig:
        pass

    def _get_collage_from_video(self, transcript: str) -> any:
        pass

    def _get_transcript_from_video(self) -> str:
        pass
