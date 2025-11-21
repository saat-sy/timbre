from dataclasses import dataclass
from typing import List
from models.lyria_config import LyriaConfig


@dataclass
class LLMResponse:
    scene_analysis: List[dict]
    master_plan: str
