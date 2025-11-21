from dataclasses import dataclass
from models.lyria_config import LyriaConfig


@dataclass
class Analysis:
    plan_instruction: str
    reality_check: str
    decision: str


@dataclass
class RealtimeLLMResponse:
    analysis: Analysis
    change_music: bool
    change_music_at: float | None = None
    lyria_config: LyriaConfig | None = None

    def dict(self):
        return {
            "analysis": {
                "plan_instruction": self.analysis.plan_instruction,
                "reality_check": self.analysis.reality_check,
                "decision": self.analysis.decision,
            },
            "change_music": self.change_music,
            "change_music_at": self.change_music_at,
            "lyria_config": self.lyria_config.dict() if self.lyria_config else None,
        }
