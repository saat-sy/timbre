import asyncio
from typing import Dict, List
from models.llm_response import LLMResponse
from models.lyria_config import LyriaConfig
from models.realtime_llm_response import RealtimeLLMResponse
from shared.logging import get_logger
from utils.llm.realtime_llm_utils import RealtimeLLMUtils

logger = get_logger(__name__)


class RealtimeEvalService:
    def __init__(
        self,
        transcription: List[Dict],
        global_config: LLMResponse,
    ) -> None:
        self.transcription = transcription
        self.global_config = global_config
        self.llm_utils = RealtimeLLMUtils(
            transcription=transcription,
            master_plan=global_config.master_plan,
            scene_analysis=global_config.scene_analysis,
        )
        self.history: List[LyriaConfig] = []

    def get_latest_config(self) -> LyriaConfig:
        if not self.history:
            raise ValueError("No configuration history available")
        return self.history[-1]

    def add_config(self, config: LyriaConfig) -> None:
        self.history.append(config)

    async def evaluate_segment(
        self, start_time: float, end_time: float
    ) -> RealtimeLLMResponse:
        try:
            logger.info(
                f"Starting real-time evaluation for segment {start_time} to {end_time}."
            )

            response = await asyncio.to_thread(
                self.llm_utils.get_realtime_response,
                start_time=start_time,
                end_time=end_time,
            )

            logger.info("Real-time evaluation completed.")

            if response.change_music:
                if response.lyria_config is not None:
                    self.add_config(response.lyria_config)
                else:
                    logger.warning(
                        "LLM indicated a music change but did not provide a new configuration."
                    )
            else:
                logger.info("No music change indicated by LLM.")

            return response
        except Exception as e:
            logger.error(f"Error during real-time evaluation: {e}")
            raise e
