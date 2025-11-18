import asyncio
from typing import Dict, List
from models.llm_response import LLMResponse
from models.lyria_config import LyriaConfig
from shared.logging import get_logger
from utils.llm.llm_utils import LLMUtils
from utils.video.video_utils import VideoUtils

logger = get_logger(__name__)

class RealtimeEvalService:
    def __init__(self, transcription: List[Dict], global_config: LLMResponse, temp_video_path: str) -> None:
        self.transcription = transcription
        self.global_config = global_config
        self.video_utils = VideoUtils(temp_video_path=temp_video_path)
        self.llm_utils = LLMUtils()
        self.history: List[LyriaConfig] = []
        self.add_config(global_config.lyria_config)

    def get_latest_config(self) -> LyriaConfig:
        if not self.history:
            raise ValueError("No configuration history available")
        return self.history[-1]
    
    def add_config(self, config: LyriaConfig) -> None:
        self.history.append(config)

    async def evaluate_segment(self, start_time: float, end_time: float) -> None:
        try:
            logger.info(f"Starting real-time evaluation for segment {start_time} to {end_time}.")
            
            frames = await asyncio.to_thread(
                self.video_utils.get_unique_frames,
                video=self.transcription[0]['video_bytes'],
                start_duration=start_time,
                end_duration=end_time
            )

            response = await asyncio.to_thread(
                self.llm_utils.get_realtime_config,
                start_time=start_time,
                end_time=end_time,
                global_context=self.global_config,
                frames=frames,
                transcript=self.transcription
            )

            logger.info("Real-time evaluation completed.")

            if response.change_music:
                if response.lyria_config is not None:
                    self.add_config(response.lyria_config)
                else:
                    logger.warning("LLM indicated a music change but did not provide a new configuration.")
            else:
                logger.info("No music change indicated by LLM.")
        except Exception as e:
            logger.error(f"Error during real-time evaluation: {e}")
            raise e


