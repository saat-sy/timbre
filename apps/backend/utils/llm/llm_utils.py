from models.global_config import GlobalConfig


class LLMUtils:
    def __init__(self) -> None:
        pass

    def _prompt(self, model: str, prompt: str, image: bytes | None = None) -> str:
        pass

    def generate_global_context(self, transcript: str, image: bytes) -> GlobalConfig:
        pass

    def generate_realtime_context(self, transcript: str, image: bytes) -> RealtimeConfig:
        pass