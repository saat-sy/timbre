from google.genai import types
from dataclasses import dataclass


@dataclass
class LyriaConfig:
    prompt: str
    bpm: int
    scale: str
    weight: float = 1.0

    def dict(self):
        return {
            "prompt": self.prompt,
            "bpm": self.bpm,
            "scale": self.scale.name,
            "weight": self.weight,
        }
