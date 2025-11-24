from dataclasses import dataclass


@dataclass
class Frame:
    data: str
    timestamp: float
    scene_start: float
    scene_end: float
