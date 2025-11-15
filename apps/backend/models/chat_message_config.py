from dataclasses import dataclass
from enum import Enum

class Role(Enum):
    USER = "user"
    ASSISTANT = "assistant"

@dataclass
class ChatMessageConfig:
    role: Role
    content: str

    def to_dict(self) -> dict:
        return {
            "role": self.role.value,
            "content": self.content
        }