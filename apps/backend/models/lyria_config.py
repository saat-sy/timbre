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
            "scale": self.scale,
            "weight": self.weight,
        }
    
    def get_lyria_scale(self) -> types.Scale:
        for scale_member in types.Scale:
            if scale_member.name.lower() == self.scale.lower():
                return scale_member
        raise ValueError(f"Invalid scale value: {self.scale}")
