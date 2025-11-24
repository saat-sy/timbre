import json
import uuid
import asyncio
import redis
from typing import Optional, Dict, Any
from models.llm_response import LLMResponse, MasterPlan, MusicBlocks
from models.lyria_config import LyriaConfig
from shared.logging import get_logger

logger = get_logger(__name__)


class RedisService:
    def __init__(
        self, redis_url: str = "redis://localhost:6379", session_ttl: int = 3600
    ):
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
        self.session_prefix = "session:"
        self.session_ttl = session_ttl

    async def connect(self):
        try:
            self.redis_client = redis.from_url(
                self.redis_url, encoding="utf-8", decode_responses=True
            )
            if self.redis_client:
                await asyncio.to_thread(self.redis_client.ping)
            logger.info("Successfully connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    async def disconnect(self):
        if self.redis_client:
            await asyncio.to_thread(self.redis_client.close)
            logger.info("Redis connection closed")

    async def store_session(self, llm_response: LLMResponse) -> str:
        if not self.redis_client:
            await self.connect()

        if not self.redis_client:
            raise RuntimeError("Failed to establish Redis connection")

        try:
            session_id = str(uuid.uuid4())
            session_key = f"{self.session_prefix}{session_id}"

            session_data = self._llm_response_to_dict(llm_response)

            await asyncio.to_thread(
                self.redis_client.setex,
                session_key, self.session_ttl, json.dumps(session_data)
            )

            logger.info(f"Session {session_id} stored successfully")
            return session_id

        except Exception as e:
            logger.error(f"Failed to store session: {e}")
            raise

    async def get_session(self, session_id: str) -> Optional[LLMResponse]:
        if not self.redis_client:
            await self.connect()

        if not self.redis_client:
            raise RuntimeError("Failed to establish Redis connection")

        try:
            session_key = f"{self.session_prefix}{session_id}"
            session_data = await asyncio.to_thread(self.redis_client.get, session_key)

            if session_data is None:
                logger.warning(f"Session {session_id} not found")
                return None

            data_dict = json.loads(str(session_data))
            llm_response = self._dict_to_llm_response(data_dict)

            logger.info(f"Session {session_id} retrieved successfully")
            return llm_response

        except Exception as e:
            logger.error(f"Failed to retrieve session {session_id}: {e}")
            raise

    async def delete_session(self, session_id: str) -> bool:
        if not self.redis_client:
            await self.connect()

        if not self.redis_client:
            raise RuntimeError("Failed to establish Redis connection")

        try:
            session_key = f"{self.session_prefix}{session_id}"
            deleted = await asyncio.to_thread(self.redis_client.delete, session_key)

            if deleted:
                logger.info(f"Session {session_id} deleted successfully")
                return True
            else:
                logger.warning(f"Session {session_id} not found for deletion")
                return False

        except Exception as e:
            logger.error(f"Failed to delete session {session_id}: {e}")
            raise

    async def extend_session_ttl(self, session_id: str, ttl: int = 1800) -> bool:
        if not self.redis_client:
            await self.connect()

        if not self.redis_client:
            raise RuntimeError("Failed to establish Redis connection")

        try:
            session_key = f"{self.session_prefix}{session_id}"
            ttl = ttl or self.session_ttl

            exists = await asyncio.to_thread(self.redis_client.expire, session_key, ttl)

            if exists:
                logger.info(f"Session {session_id} TTL extended to {ttl} seconds")
                return True
            else:
                logger.warning(f"Session {session_id} not found for TTL extension")
                return False

        except Exception as e:
            logger.error(f"Failed to extend session {session_id} TTL: {e}")
            raise

    def _llm_response_to_dict(self, llm_response: LLMResponse) -> Dict[str, Any]:
        return {
            "scene_analysis": llm_response.scene_analysis,
            "master_plan": {
                "global_context": llm_response.master_plan.global_context,
                "musical_blocks": [
                    {
                        "time_range": block.time_range,
                        "musical_direction": block.musical_direction,
                        "transition": block.transition,
                        "lyria_config": {
                            "prompt": block.lyria_config.prompt,
                            "bpm": block.lyria_config.bpm,
                            "scale": block.lyria_config.scale,
                            "weight": block.lyria_config.weight,
                        },
                    }
                    for block in llm_response.master_plan.musical_blocks
                ],
            },
        }

    def _dict_to_llm_response(self, data: Dict[str, Any]) -> LLMResponse:
        musical_blocks = []
        for block_data in data["master_plan"]["musical_blocks"]:
            lyria_config = LyriaConfig(
                prompt=block_data["lyria_config"]["prompt"],
                bpm=block_data["lyria_config"]["bpm"],
                scale=block_data["lyria_config"]["scale"],
                weight=block_data["lyria_config"]["weight"],
            )

            music_block = MusicBlocks(
                time_range=block_data["time_range"],
                musical_direction=block_data["musical_direction"],
                transition=block_data["transition"],
                lyria_config=lyria_config,
            )
            musical_blocks.append(music_block)

        master_plan = MasterPlan(
            global_context=data["master_plan"]["global_context"],
            musical_blocks=musical_blocks,
        )

        return LLMResponse(
            scene_analysis=data["scene_analysis"],
            master_plan=master_plan,
        )
