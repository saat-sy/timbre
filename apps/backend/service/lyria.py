import os
import asyncio
from google import genai
from google.genai import types
from google.genai.live_music import AsyncMusicSession
from fastapi import WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from models.lyria_config import LyriaConfig
from utils.commands import Commands
from utils.logging import get_logger
import json

load_dotenv()
logger = get_logger(__name__)


class LyriaService:
    def __init__(self, user_websocket: WebSocket) -> None:
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

                    logger.info("Processing config")
                    config_updated = False
                    if command.get(Commands.BPM):
                        bpm_value = int(command[Commands.BPM])
                        if bpm_value < 30 or bpm_value > 300:
                            logger.warning(
                                "BPM value %d is outside recommended range (30-300)",
                                bpm_value,
                            )
                        self.config.bpm = bpm_value
                        logger.info("Updated BPM to %d", self.config.bpm)
                        config_updated = True

                    if command.get(Commands.SCALE):
                        scale = command[Commands.SCALE]
                        found_scale_enum_member = None
                        for scale_member in types.Scale:
                            if scale_member.name.lower() == scale.lower():
                                found_scale_enum_member = scale_member
                                break
                        if found_scale_enum_member:
                            logger.info(
                                "Setting scale to %s, which requires resetting context.",
                                found_scale_enum_member.name,
                            )
                            self.config.scale = found_scale_enum_member
                            config_updated = True
                        else:
                            logger.warning(
                                "Error: Matching enum for scale change not found for scale: %s",
                                scale,
                            )

                    if config_updated:
                        await session.set_music_generation_config(config=self.config)
                        await session.reset_context()
                        logger.info("Updated music generation config and reset context")

                    logger.info("Processing prompt")
                    if command.get(Commands.PROMPT):
                        prompt_text = command[Commands.PROMPT]
                        weight = float(command.get(Commands.WEIGHT, 1.0))
                        if weight < 0.0 or weight > 10.0:
                            logger.warning(
                                "Weight value %.2f is outside recommended range (0.0-10.0)",
                                weight,
                            )
                        await session.set_weighted_prompts(
                            prompts=[
                                types.WeightedPrompt(text=prompt_text, weight=weight)
                            ]
                        )
                        logger.info(
                            "Updated prompt to '%s' with weight %.2f",
                            prompt_text,
                            weight,
                        )

                except json.JSONDecodeError as e:
                    logger.error("Failed to parse JSON message: %s", e)
                    continue
                except ValueError as e:
                    logger.error("Invalid value in command: %s", e)
                    continue
        except WebSocketDisconnect as e:
            logger.info(f"Client disconnected (command loop): {e}")
        except Exception as e:
            logger.error(f"UNEXPECTED command loop error: {e}", exc_info=True)
        finally:
            logger.info("Command loop has fully ended.")

    async def _proxy_audio_to_client(self, session: AsyncMusicSession) -> None:
        logger.info("Audio proxy loop started. Streaming audio to client.")
        try:
            chunks_count = 0
            async for message in session.receive():
                chunks_count += 1
                if chunks_count == 1:
                    await asyncio.sleep(self.BUFFER_SECONDS)
                if message.server_content and message.server_content.audio_chunks:
                    audio_data = message.server_content.audio_chunks[0].data
                    if audio_data:
                        await self.user_websocket.send_bytes(audio_data)
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

    async def start_session(self, lyria_config: LyriaConfig) -> None:
        logger.info("Starting Lyria session with config: %s", lyria_config)
        try:
            self.config.bpm = lyria_config.bpm
            self.config.scale = lyria_config.scale

            session: AsyncMusicSession
            async with self.client.aio.live.music.connect(model=self.model) as session:
                logger.info("Lyria session connected")
                await session.set_weighted_prompts(
                    prompts=[
                        types.WeightedPrompt(
                            text=lyria_config.prompt, weight=lyria_config.weight
                        )
                    ]
                )
                await session.set_music_generation_config(config=self.config)

                logger.info("Playing Lyria session")
                await session.play()

                logger.info("Starting send and receive tasks")
                send_task = asyncio.create_task(self._proxy_commands_to_lyria(session))
                receive_task = asyncio.create_task(self._proxy_audio_to_client(session))

                try:
                    await asyncio.gather(
                        send_task, receive_task, return_exceptions=True
                    )
                except Exception as e:
                    logger.error("Error in session tasks: %s", e)
                    if not send_task.done():
                        send_task.cancel()
                    if not receive_task.done():
                        receive_task.cancel()
                    await asyncio.gather(
                        send_task, receive_task, return_exceptions=True
                    )

        except Exception as e:
            logger.error("Error in Lyria session: %s", e, exc_info=True)
            raise
        finally:
            logger.info("Lyria session ended")
