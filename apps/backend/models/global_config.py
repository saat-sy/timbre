from dataclasses import dataclass
from models.lyria_config import LyriaConfig


@dataclass
class GlobalConfig:
    lyria_config: LyriaConfig
    context: str
    transcription: str

    def dict(self):
        return {
            "lyria_config": self.lyria_config.dict(),
            "context": self.context,
            "transcription": self.transcription,
        }
