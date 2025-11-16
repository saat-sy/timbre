import os
import json
from google.genai import types
from groq import Groq
from groq.types.chat import ChatCompletion
from typing import List
from dotenv import load_dotenv
from models.global_config import GlobalConfig
from models.frame import Frame
from models.lyria_config import LyriaConfig
from shared.logging import get_logger
from utils.llm.prompts import Prompts

logger = get_logger(__name__)
load_dotenv()

class LLMUtils:
    def __init__(self) -> None:
        self.client: Groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.vision_model = os.getenv("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

    def parse_global_config_response(self, response: ChatCompletion, transcript: dict) -> GlobalConfig:
        try:
            logger.info("Parsing global configuration response from LLM.")
            content = response.choices[0].message.content
            if content:
                config_data = json.loads(content)
                if 'lyria_config' not in config_data:
                    raise ValueError("Missing 'lyria_config' in LLM response")
                if 'context' not in config_data:
                    raise ValueError("Missing 'context' in LLM response")

                if 'transcription' not in config_data:
                    config_data['transcription'] = str(transcript)

                lyria_config = config_data['lyria_config']
                required_lyria_fields = ['prompt', 'bpm', 'scale', 'weight']
                for field in required_lyria_fields:
                    if field not in lyria_config:
                        raise ValueError(f"Missing '{field}' in lyria_config")

                bpm = lyria_config['bpm']
                if not isinstance(bpm, int) or not (60 <= bpm <= 200):
                    raise ValueError("BPM must be an integer between 60 and 200")
                
                scale = lyria_config['scale']
                if scale not in [scale.name for scale in types.Scale]:
                    raise ValueError(f"Scale '{scale}' is not a valid musical scale")
                
                lyria_config_obj = LyriaConfig(
                    prompt=lyria_config['prompt'],
                    bpm=lyria_config['bpm'],
                    scale=lyria_config['scale'],
                    weight=lyria_config['weight']
                )
                
                return GlobalConfig(
                    lyria_config=lyria_config_obj,
                    context=config_data['context'],
                    transcription=config_data['transcription']
                )
            else:
                raise ValueError("No content in LLM response.")
        except Exception as e:
            logger.error(f"Unexpected error: {e}. Using default configuration.")
            default_lyria = LyriaConfig(
                prompt="Ambient, neutral background music",
                bpm=120,
                scale=types.Scale.C_MAJOR_A_MINOR,
                weight=1.0
            )
            return GlobalConfig(
                lyria_config=default_lyria,
                context="Default configuration due to unexpected error",
                transcription=str(transcript)
            )
            

    def get_global_config(self, transcript: dict, frames: List[Frame]) -> GlobalConfig:
        logger.info("Generating global configuration for video.")
        
        prompt = Prompts.get_global_context_prompt(transcription=transcript)

        content = []
        content.append({
            "type": "text",
            "text": prompt
        }) 

        for frame in frames:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{frame.data}",
                },
            })

        logger.info("Sending request to LLM for global configuration.")
        response = self.client.chat.completions.create(
            model=self.vision_model,
            messages=[
                {
                    "role": "user",
                    "content": content
                }
            ],
            stream=False,
            temperature=0.7,
            max_tokens=1000
        )

        logger.debug(f"LLM Response: {response}")
        logger.info("Global configuration generated successfully. Parsing response.")

        return self.parse_global_config_response(response, transcript)