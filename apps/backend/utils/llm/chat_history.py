from typing import List
from models.chat_message_config import ChatMessageConfig, Role


# TODO: Implement summarization of the chat history to manage context length and increase speed.
class ChatHistory:
    def __init__(self) -> None:
        self.history: List[ChatMessageConfig] = []

    def add_message(self, role: Role, content: str) -> None:
        message = ChatMessageConfig(role=role, content=content)
        self.history.append(message)

    def get_history(self) -> List[dict]:
        return [message.to_dict() for message in self.history]
