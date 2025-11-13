import json
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google.genai import types
from service.lyria import LyriaService
from models.lyria_config import LyriaConfig
from utils.commands import Commands
from utils.logging import get_logger

logger = get_logger(__name__)

app = FastAPI(title="Timbre Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/music")
async def music_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection accepted")

    try:
        message = await websocket.receive_text()
        data = json.loads(message)

        required_fields = [
            Commands.PROMPT,
            Commands.BPM,
            Commands.SCALE,
            Commands.WEIGHT,
        ]
        missing_fields = [field for field in required_fields if not data.get(field)]

        if missing_fields:
            logger.error("Missing required parameters: %s", ", ".join(missing_fields))
            await websocket.close(
                code=1003, reason=f"Missing parameters: {', '.join(missing_fields)}"
            )
            return

        try:
            prompt = data.get(Commands.PROMPT)
            bpm = int(data.get(Commands.BPM))
            scale_str = data.get(Commands.SCALE)
            weight = float(data.get(Commands.WEIGHT))

            if bpm < 30 or bpm > 300:
                logger.error("BPM value %d is outside valid range (30-300)", bpm)
                await websocket.close(
                    code=1003, reason="BPM must be between 30 and 300"
                )
                return

            if weight < 0.0 or weight > 10.0:
                logger.error(
                    "Weight value %.2f is outside valid range (0.0-10.0)", weight
                )
                await websocket.close(
                    code=1003, reason="Weight must be between 0.0 and 10.0"
                )
                return

            scale_enum = None
            for scale_member in types.Scale:
                if scale_member.name.lower() == scale_str.lower():
                    scale_enum = scale_member
                    break

            if scale_enum is None:
                logger.error("Invalid scale value: %s", scale_str)
                await websocket.close(code=1003, reason=f"Invalid scale: {scale_str}")
                return

            lyria_config = LyriaConfig(
                prompt=prompt, bpm=bpm, scale=scale_enum, weight=weight
            )
        except ValueError as e:
            logger.error("Invalid data type in parameters: %s", e)
            await websocket.close(code=1003, reason="Invalid parameter format")
            return

        lyria_service = LyriaService(user_websocket=websocket)
        await lyria_service.start_session(lyria_config=lyria_config)

        logger.info("Lyria session started successfully")
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except json.JSONDecodeError as e:
        logger.error("Invalid JSON received: %s", e)
        try:
            await websocket.close(code=1003, reason="Invalid JSON format")
        except Exception:
            pass
    except Exception as e:
        logger.error("Error in WebSocket connection: %s", e)
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except Exception:
            pass
    finally:
        logger.info("WebSocket connection closed and resources cleaned up")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
