from typing import List


# TODO: Implement summarization of the chat history to manage context length and increase speed.
class ChatHistory:
    def __init__(self) -> None:
        self.history: List[dict] = []

    def add_message(self, role: str, content: str) -> None:
        message = {"role": role, "content": content}
        self.history.append(message)

    def get_history(self) -> List[dict]:
        return self.history
