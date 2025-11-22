import os
import asyncio
from google import genai
from google.genai import types
from google.genai.live_music import AsyncMusicSession
from fastapi import WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from models.llm_response import LLMResponse
from models.lyria_config import LyriaConfig
from shared.commands import Commands
from shared.logging import get_logger
import json

load_dotenv()
logger = get_logger(__name__)


class LyriaService:
    def __init__(self, user_websocket: WebSocket, llm_response: LLMResponse) -> None:
        logger.info("Initializing LyriaService")
        self.user_websocket = user_websocket
        self.model = "models/lyria-realtime-exp"
        self.BUFFER_SECONDS = 1.0

        if not os.getenv("GOOGLE_API_KEY"):
            raise ValueError("GOOGLE_API_KEY not found in environment variables")
        self.client = genai.Client(
            api_key=os.getenv("GOOGLE_API_KEY"), http_options={"api_version": "v1alpha"}
        )
        self.config = types.LiveMusicGenerationConfig()

        self.llm_response = llm_response
        self.elapsed_music_time = 0.0

        self.current_config = self.llm_response.master_plan.musical_blocks[
            0
        ].lyria_config

        logger.info("LyriaService initialized successfully")

    async def _proxy_commands_to_lyria(self, session: AsyncMusicSession) -> None:
        logger.info("Command loop started. Waiting for commands from client.")
        try:
            while True:
                message = await self.user_websocket.receive_text()
                logger.info("Received command from client: %s", message)

                try:
                    command = json.loads(message)
                    logger.info("Parsed JSON command: %s", command)

                    logger.info("Processing commands")

                    if command.get(Commands.COMMAND):
                        if command[Commands.COMMAND] == Commands.PLAY:
                            await session.play()
                            logger.info("Sent PLAY command to Lyria session")
                        elif command[Commands.COMMAND] == Commands.PAUSE:
                            await session.pause()
                            logger.info("Sent PAUSE command to Lyria session")
                        elif command[Commands.COMMAND] == Commands.STOP:
                            await session.stop()
                            logger.info("Sent STOP command to Lyria session")
                            break
                except ValueError as e:
                    logger.error("Invalid value in command: %s", e)
                    continue
        except WebSocketDisconnect as e:
            logger.info(f"Client disconnected (command loop): {e}")
        except Exception as e:
            logger.error(f"UNEXPECTED command loop error: {e}", exc_info=True)
        finally:
            logger.info("Command loop has fully ended.")

    async def _check_for_music_update(self, session: AsyncMusicSession) -> None:
        for i, segment in enumerate(self.llm_response.master_plan.musical_blocks):
            end = segment.time_range.get("end", float("inf"))
            if (
                self.elapsed_music_time <= end
                and float(end) - self.elapsed_music_time <= 3
            ):
                if i + 1 < len(self.llm_response.master_plan.musical_blocks):
                    logger.info(
                        "Music update needed. Elapsed time: %.2f, Segment end time: %.2f",
                        self.elapsed_music_time,
                        end,
                    )
                    new_config = self.llm_response.master_plan.musical_blocks[
                        i + 1
                    ].lyria_config
                    update_config = False
                    if self.current_config.bpm != new_config.bpm:
                        self.config.bpm = new_config.bpm
                        update_config = True
                        logger.info("Updated BPM to %d", self.config.bpm)
                    if self.current_config.scale != new_config.scale:
                        self.config.scale = new_config.get_lyria_scale()
                        update_config = True
                        logger.info("Updated Scale to %s", self.config.scale.name)
                    if update_config:
                        await session.set_music_generation_config(config=self.config)
                        await session.reset_context()
                        logger.info("Injected new configuration and reset context")

                    prompt_text = new_config.prompt
                    weight = new_config.weight

                    await session.set_weighted_prompts(
                        prompts=[
                            types.WeightedPrompt(
                                text=prompt_text,
                                weight=weight,
                            )
                        ]
                    )

                    self.current_config = new_config
                else:
                    return

    async def _proxy_audio_to_client(self, session: AsyncMusicSession) -> None:
        logger.info("Audio proxy loop started. Streaming audio to client.")
        try:
            chunks_count = 0
            first_chunk_sent = False
            async for message in session.receive():
                chunks_count += 1
                if chunks_count == 1:
                    await asyncio.sleep(self.BUFFER_SECONDS)
                if message.server_content and message.server_content.audio_chunks:
                    audio_data = message.server_content.audio_chunks[0].data
                    if audio_data:
                        if not first_chunk_sent:
                            await self.user_websocket.send_text(Commands.PLAYING)
                            logger.info("Sent playing message to client")
                            first_chunk_sent = True
                        await self.user_websocket.send_bytes(audio_data)
                        self.elapsed_music_time += 2  # 2 seconds are sent in each chunk
                        logger.info(
                            "Sent audio chunk to client, total elapsed music time: %.2f seconds",
                            self.elapsed_music_time,
                        )
                        await self._check_for_music_update(session)
                    else:
                        logger.info("Received audio chunk with no data.")
                elif message.filtered_prompt:
                    logger.info("Prompt was filtered out: %s", message.filtered_prompt)
                else:
                    logger.info("Unknown error occurred with message: %s", message)
                await asyncio.sleep(10**-12)
        except WebSocketDisconnect as e:
            logger.info(f"Client disconnected (audio loop): {e}")
        except Exception as e:
            logger.error(f"UNEXPECTED audio loop error: {e}", exc_info=True)
        finally:
            logger.info("Audio loop has fully ended.")

    async def start_session(self) -> None:
        logger.info("Starting Lyria session with config: %s", self.current_config)
        try:
            self.config.bpm = self.current_config.bpm
            self.config.scale = self.current_config.get_lyria_scale()

            session: AsyncMusicSession
            async with self.client.aio.live.music.connect(model=self.model) as session:
                logger.info("Lyria session connected")
                await session.set_weighted_prompts(
                    prompts=[
                        types.WeightedPrompt(
                            text=self.current_config.prompt,
                            weight=self.current_config.weight,
                        )
                    ]
                )
                await session.set_music_generation_config(config=self.config)

                logger.info("Playing Lyria session")
                await session.play()

                logger.info("Starting send and receive tasks")
                send_task = None
                receive_task = None
                try:
                    send_task = asyncio.create_task(
                        self._proxy_commands_to_lyria(session)
                    )
                    receive_task = asyncio.create_task(
                        self._proxy_audio_to_client(session)
                    )

                    await asyncio.gather(
                        send_task, receive_task, return_exceptions=True
                    )
                except Exception as e:
                    logger.error("Error in session tasks: %s", e)
                    if send_task and not send_task.done():
                        send_task.cancel()
                    if receive_task and not receive_task.done():
                        receive_task.cancel()
                    if send_task and receive_task:
                        await asyncio.gather(
                            send_task, receive_task, return_exceptions=True
                        )
                finally:
                    if send_task and not send_task.done():
                        send_task.cancel()
                    if receive_task and not receive_task.done():
                        receive_task.cancel()
                    logger.info("Lyria session tasks cleaned up")

        except Exception as e:
            logger.error("Error in Lyria session: %s", e, exc_info=True)
            raise
        finally:
            logger.info("Lyria session ended")
