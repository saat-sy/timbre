from dataclasses import dataclass
from models.lyria_config import LyriaConfig

@dataclass
class RealtimeLLMResponse:
    lyria_config: LyriaConfig | None
    context: str
    change_music: bool
    change_music_at: int | None = None

    def dict(self):
        return {
            "lyria_config": self.lyria_config.dict() if self.lyria_config else None,
            "context": self.context,
            "change_music": self.change_music,
            "change_music_at": self.change_music_at,
        }