from dataclasses import dataclass


@dataclass
class Frame:
    data: bytes
    timestamp: float
