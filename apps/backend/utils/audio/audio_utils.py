import os
import json
from dotenv import load_dotenv
from groq import Groq
from shared.logging import get_logger

logger = get_logger(__name__)
load_dotenv()


class AudioUtils:
    def __init__(self) -> None:
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def get_transcription(self, audio_bytes: bytes) -> dict:
        pass
