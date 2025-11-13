from google.genai import types
from dataclasses import dataclass


@dataclass
class LyriaConfig:
    prompt: str
    bpm: int
    scale: types.Scale
    weight: float = 1.0
