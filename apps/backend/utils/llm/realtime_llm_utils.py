import os
import time
from typing import List, Optional
from dotenv import load_dotenv
from groq import Groq
from models.realtime_llm_response import RealtimeLLMResponse, Analysis
from utils.llm.llm_validators import LLMValidators
from utils.llm.prompts import Prompts
from shared.logging import get_logger

logger = get_logger(__name__)
load_dotenv()


class RealtimeLLMUtils:
    API_TIMEOUT = 60
    MAX_RETRIES = 3
    RETRY_DELAY = 2

    def __init__(
        self,
        transcription: List[dict],
        master_plan: str,
        scene_analysis: List[dict],
        model: Optional[str] = None,
    ) -> None:
        if not isinstance(transcription, list):
            raise ValueError("Transcription must be a list")
        if not isinstance(master_plan, str) or not master_plan.strip():
            raise ValueError("Master plan must be a non-empty string")
        if not isinstance(scene_analysis, list):
            raise ValueError("Scene analysis must be a list")

        self.messages = []
        try:
            self.system_prompt = Prompts.get_realtime_context_prompt(
                transcription=transcription,
                master_plan=master_plan,
                scene_analysis=scene_analysis,
            )
            self.messages.append({"role": "system", "content": self.system_prompt})
        except Exception as e:
            logger.error(f"Failed to initialize system prompt: {e}")
            raise RuntimeError(f"System prompt initialization failed: {e}")

        self.model = model or os.getenv("GROQ_REALTIME_MODEL", "openai/gpt-oss-120b")

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")

        try:
            self.client: Groq = Groq(api_key=api_key)
        except Exception as e:
            logger.error(f"Failed to initialize Groq client: {e}")
            raise RuntimeError(f"Groq client initialization failed: {e}")

        logger.info(f"RealtimeLLMUtils initialized successfully")

    def get_realtime_response(
        self, start_time: float, end_time: float
    ) -> RealtimeLLMResponse:
        if not isinstance(start_time, (int, float)) or not isinstance(
            end_time, (int, float)
        ):
            raise ValueError("Start and end times must be numbers")
        if start_time < 0 or end_time < 0:
            raise ValueError("Times must be non-negative")
        if start_time >= end_time:
            raise ValueError("Start time must be less than end time")

        user_prompt = (
            f"Please analyze the video segment from {start_time} to {end_time} seconds."
        )
        self.messages.append({"role": "user", "content": user_prompt})

        try:
            formatted_response = None
            parse_retries = 0

            while parse_retries < self.MAX_RETRIES:
                try:
                    response = LLMValidators.make_api_call_with_retry(
                        self.client,
                        self.MAX_RETRIES,
                        self.RETRY_DELAY,
                        self.API_TIMEOUT,
                        model=self.model,
                        messages=self.messages,
                        stream=False,
                        temperature=0.7,
                        max_tokens=1000,
                    )

                    formatted_response = LLMValidators.parse_realtime_llm_response(
                        response
                    )
                    break
                except Exception as parse_error:
                    parse_retries += 1
                    logger.warning(
                        f"LLM call and parse attempt {parse_retries} failed: {parse_error}"
                    )
                    if parse_retries >= self.MAX_RETRIES:
                        logger.error(
                            f"Failed to get and parse LLM response after {self.MAX_RETRIES} attempts"
                        )
                        raise parse_error
                    time.sleep(
                        self.RETRY_DELAY * (2 ** (parse_retries - 1))
                    )  # Exponential backoff

            if formatted_response is not None:
                try:
                    response_content = str(formatted_response.dict())
                except Exception:
                    response_content = (
                        f"Response: change_music={formatted_response.change_music}"
                    )

                self.messages.append({"role": "assistant", "content": response_content})
                return formatted_response
            else:
                raise RuntimeError("Failed to parse response after all retry attempts")
        except Exception as e:
            logger.error(f"Failed to get realtime response: {e}")
            fallback_analysis = Analysis(
                plan_instruction=f"Fallback analysis for segment {start_time}-{end_time}s",
                reality_check="Unable to analyze due to technical difficulties",
                decision="Maintaining current music state as fallback",
            )
            return RealtimeLLMResponse(
                analysis=fallback_analysis,
                change_music=False,
                change_music_at=None,
                lyria_config=None,
            )
