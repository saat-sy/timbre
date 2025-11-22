from dataclasses import dataclass
from typing import List
from models.lyria_config import LyriaConfig


@dataclass
class MusicBlocks:
    time_range: dict
    musical_direction: str
    transition: str
    lyria_config: LyriaConfig


@dataclass
class MasterPlan:
    global_context: str
    musical_blocks: List[MusicBlocks]


@dataclass
class LLMResponse:
    scene_analysis: List[dict]
    master_plan: MasterPlan
