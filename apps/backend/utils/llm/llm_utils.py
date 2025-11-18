import os
from google.genai import types
from groq import Groq
from typing import List, Optional
from dotenv import load_dotenv
from models.llm_response import LLMResponse
from models.frame import Frame
from models.lyria_config import LyriaConfig
from models.realtime_llm_response import RealtimeLLMResponse
from shared.logging import get_logger
from utils.llm.chat_history import ChatHistory
from utils.llm.prompts import Prompts
from utils.llm.llm_validators import LLMValidators

logger = get_logger(__name__)
load_dotenv()

class LLMUtils:
    API_TIMEOUT = 60
    MAX_RETRIES = 3
    RETRY_DELAY = 2
    MAX_FRAMES_PER_REQUEST = 5

    def __init__(self, history: bool = False) -> None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable is required")
            
        self.client: Groq = Groq(api_key=api_key)
        self.vision_model = os.getenv("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
        self.history: Optional[ChatHistory] = ChatHistory() if history else None

    def get_global_config(self, transcript: dict, frames: List[Frame]) -> LLMResponse:
        logger.info("Generating global configuration for video.")
        
        try:
            LLMValidators.validate_transcript(transcript)
            LLMValidators.validate_frames(frames)
            
            system_prompt = Prompts.get_global_context_prompt(transcription=transcript)
            chunks = LLMValidators.chunk_frames(frames, self.MAX_FRAMES_PER_REQUEST)

            history = []
            for chunk in chunks:
                messages = []
                messages.append({
                    "role": "system",
                    "content": system_prompt
                })

                if chunk != chunks[-1]:
                    user_prompt = "Please analyze the next set of frames and provide an updated global music configuration based on the video's narrative so far. Do not finalize the configuration yet."
                else:
                    user_prompt = "This is the final set of frames. Please provide the final global music configuration for the entire video."

                content = []
                content.append({
                    "type": "text",
                    "text": user_prompt
                })
                for frame in chunk:
                    content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{frame.data}",
                        },
                    })

                messages.append(history)
                messages.append({
                    "role": "user",
                    "content": content
                })

                logger.info("Sending request to LLM for global configuration chunk.")

                response = LLMValidators.make_api_call_with_retry(
                    self.client,
                    self.MAX_RETRIES,
                    self.RETRY_DELAY,
                    self.API_TIMEOUT,
                    model=self.vision_model,
                    messages=messages,
                    stream=False,
                    temperature=0.7,
                    max_tokens=1000
                )

                logger.debug(f"LLM Response: {response}")

                if chunk == chunks[-1]:
                    logger.info("Final global configuration chunk received. Parsing response.")
                    return LLMValidators.parse_llm_response(response, transcript)
                else:
                    logger.info("Interim global configuration chunk received. Updating history.")
                    interim_result = response.choices[0].message.content
                    history.append({
                        "role": "assistant",
                        "content": interim_result
                    })

            raise ValueError("No final chunk processed for global configuration")
        except Exception as e:
            logger.error(f"Error in get_global_config: {e}. Using default configuration.")
            default_lyria = LyriaConfig(
                prompt="Ambient, neutral background music",
                bpm=120,
                scale=types.Scale.C_MAJOR_A_MINOR.name,
                weight=1.0
            )
            return LLMResponse(
                lyria_config=default_lyria,
                context="Default configuration due to error in get_global_config",
                transcription=str(transcript)
            )
    
    def get_realtime_config(self, duration_start: float, duration_end: float, global_context: dict, transcript: str, frames: List[Frame]) -> RealtimeLLMResponse:
        logger.info("Generating real-time configuration for video segment.")
        
        try:
            LLMValidators.validate_duration(duration_start, duration_end)
            LLMValidators.validate_transcript(transcript)
            LLMValidators.validate_frames(frames)
            
            if global_context is None or not isinstance(global_context, dict):
                logger.warning("Invalid global_context provided, using empty dict")
                global_context = {}
            
            if not self.history:
                logger.warning("Chat history is not initialized for real-time configuration. Continuing without history.")
                self.history = ChatHistory()
            
            system_prompt = Prompts.get_realtime_context_prompt(transcription=transcript, global_context=str(global_context))

            messages = []
            messages.append(system_prompt)
            messages.extend(self.history.get_history())

            content = []
            
            segment_prompt = Prompts.get_realtime_segment_prompt(duration_start, duration_end)
            content.append({
                "type": "text",
                "text": segment_prompt
            })

            for frame in frames:
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{frame.data}",
                    },
                })

            messages.append({
                "role": "user",
                "content": content
            })

            if len(messages) == 0:
                raise ValueError("No messages to send to LLM")

            logger.info("Sending request to LLM for real-time configuration.")
            response = LLMValidators.make_api_call_with_retry(
                self.client,
                self.MAX_RETRIES,
                self.RETRY_DELAY,
                self.API_TIMEOUT,
                model=self.vision_model,
                messages=messages,
                stream=False,
                temperature=0.7,
                max_tokens=1000
            )

            logger.debug(f"LLM Response: {response}")
            logger.info("Real-time configuration generated successfully. Parsing response.")

            result = LLMValidators.parse_realtime_llm_response(response)
            
            if result.lyria_config and self.history and response.choices[0].message.content:
                self.history.add_message("assistant", response.choices[0].message.content)
            
            return result
            
        except Exception as e:
            logger.error(f"Error in get_realtime_config: {e}. Using default configuration.")
            return RealtimeLLMResponse(
                lyria_config=None,
                context="Default real-time configuration due to error in get_realtime_config",
                change_music=False,
                change_music_at=None
            )
