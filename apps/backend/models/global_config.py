from dataclasses import dataclass
from models.lyria_config import LyriaConfig

@dataclass
class GlobalConfig:
    lyria_config: LyriaConfig
    context: str
    transcription: str
