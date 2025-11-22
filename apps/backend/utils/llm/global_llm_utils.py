import os
from groq import Groq
from typing import List, Optional
from dotenv import load_dotenv
import concurrent.futures
from models.llm_response import LLMResponse, MasterPlan
from models.frame import Frame
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
        self.vision_model = os.getenv(
            "GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"
        )
        self.reasoning_model = os.getenv("GROQ_REASONING_MODEL", "openai/gpt-oss-120b")
        self.history: Optional[ChatHistory] = ChatHistory() if history else None

    def _process_chunk(
        self, chunk: List[Frame], transcript: List[dict], system_prompt: str
    ) -> List[dict]:
        scene_data = []
        for scene in chunk:
            scene_data.append(
                {
                    "timestamp": scene.timestamp,
                    "scene_start": scene.scene_start,
                    "scene_end": scene.scene_end,
                    "transcription": LLMValidators.extract_transcription_for_scene(
                        transcript, scene.scene_start, scene.scene_end
                    ),
                }
            )

        user_prompt = Prompts.get_global_context_user_prompt(scene_data=scene_data)

        content = []
        content.append({"type": "text", "text": user_prompt})
        for frame in chunk:
            content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{frame.data}",
                    },
                }
            )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content},
        ]

        logger.info("Sending request to LLM for global configuration chunk.")

        for attempt in range(self.MAX_RETRIES):
            response = LLMValidators.make_api_call_with_retry(
                self.client,
                self.MAX_RETRIES,
                self.RETRY_DELAY,
                self.API_TIMEOUT,
                model=self.vision_model,
                messages=messages,
                stream=False,
                temperature=0.7,
                max_tokens=1000,
            )

            logger.debug(f"LLM Response (attempt {attempt + 1}): {response}")
            logger.info("Parsing response.")

            try:
                return LLMValidators.parse_scene_analysis(response, chunk)
            except Exception as parse_error:
                logger.warning(f"Parse attempt {attempt + 1} failed: {parse_error}")

                if attempt < self.MAX_RETRIES - 1:
                    logger.info(
                        f"Retrying LLM call due to parsing failure (attempt {attempt + 2}/{self.MAX_RETRIES})"
                    )
                else:
                    logger.error(
                        f"All parsing attempts failed for chunk. Last error: {parse_error}"
                    )
                    return []
        return []

    def get_global_config(
        self, transcript: List[dict], frames: List[Frame]
    ) -> LLMResponse:
        logger.info("Generating global configuration for video.")

        try:
            LLMValidators.validate_transcript(transcript)
            LLMValidators.validate_frames(frames)

            system_prompt = Prompts.get_global_context_prompt()
            chunks = LLMValidators.chunk_frames(frames, self.MAX_FRAMES_PER_REQUEST)

            logger.info(f"Processing {len(chunks)} chunks in parallel.")

            with concurrent.futures.ThreadPoolExecutor(
                max_workers=min(len(chunks), 10)
            ) as executor:
                future_to_chunk = {
                    executor.submit(
                        self._process_chunk, chunk, transcript, system_prompt
                    ): chunk
                    for chunk in chunks
                }

                scene_analysis = []
                for future in concurrent.futures.as_completed(future_to_chunk):
                    try:
                        chunk_result = future.result()
                        scene_analysis.extend(chunk_result)
                    except Exception as exc:
                        _ = future_to_chunk[future]
                        logger.error(f"Chunk processing generated an exception: {exc}")

            logger.info("Generating master plan based on scene analysis.")
            
            global_prompt = Prompts.get_global_summary_plan_prompt(
                scenes=scene_analysis, transcription=transcript
            )

            messages = []
            messages.append({"role": "user", "content": global_prompt})

            master_plan = None
            for attempt in range(self.MAX_RETRIES):
                try:
                    response = LLMValidators.make_api_call_with_retry(
                        self.client,
                        self.MAX_RETRIES,
                        self.RETRY_DELAY,
                        self.API_TIMEOUT,
                        model=self.reasoning_model,
                        messages=messages,
                        stream=False,
                        temperature=0.7,
                    )

                    if not response.choices or not response.choices[0].message.content:
                        logger.error("No content in LLM response for master plan")
                        raise ValueError("No content in LLM response for master plan")

                    logger.info(response.choices[0].message.content)

                    master_plan = LLMValidators.validate_master_plan_response(
                        response.choices[0].message.content
                    )
                    break
                    
                except Exception as parse_error:
                    logger.warning(f"Master plan parse attempt {attempt + 1} failed: {parse_error}")
                    
                    if attempt < self.MAX_RETRIES - 1:
                        logger.info(f"Retrying master plan generation due to parsing failure (attempt {attempt + 2}/{self.MAX_RETRIES})")
                    else:
                        logger.error(f"All master plan parsing attempts failed. Last error: {parse_error}")
                        raise parse_error
            
            if master_plan is None:
                raise ValueError("Failed to generate valid master plan after all retries")

            return LLMResponse(
                scene_analysis=scene_analysis,
                master_plan=master_plan,
            )

        except Exception as e:
            logger.error(
                f"Error in get_global_config: {e}. Using default configuration."
            )
            return LLMResponse(
                scene_analysis=[],
                master_plan=MasterPlan(
                    global_context="Default Concept",
                    musical_blocks=[],
                ),
            )
