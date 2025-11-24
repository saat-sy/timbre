import os
import json
import uvicorn
from contextlib import asynccontextmanager
from typing import Dict, Any
from fastapi import (
    FastAPI,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    HTTPException,
    File,
    status,
    Depends,
)
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from service.global_eval.global_eval_service import GlobalEvalService
from service.lyria.lyria_service import LyriaService
from shared.logging import get_logger
from service.redis_service import RedisService
from service.auth.dependencies import get_current_user, get_ws_token

logger = get_logger(__name__)
load_dotenv()

redis_service = RedisService(
    redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
    session_ttl=int(os.getenv("REDIS_SESSION_TTL", "3600")),
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await redis_service.connect()
        logger.info("Application startup completed - Redis connected")
    except Exception as e:
        logger.error(f"Failed to initialize Redis on startup: {e}")

    yield

    # Shutdown
    try:
        await redis_service.disconnect()
        logger.info("Application shutdown completed - Redis disconnected")
    except Exception as e:
        logger.error(f"Error during Redis cleanup on shutdown: {e}")


app = FastAPI(title="Timbre Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/context")
async def get_context(
    file: UploadFile = File(
        ..., description="MP4 video file to analyze", media_type="video/mp4"
    ),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    logger.info("Processing video file for global context extraction")

    if not file or not file.filename:
        logger.error("No video file provided in request")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Video file is required"
        )

    if file.content_type not in ["video/mp4", "video/mpeg"]:
        logger.error(f"Invalid file type: {file.content_type}")
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only MP4 video files are supported",
        )

    max_file_size = int(os.getenv("MAX_FILE_SIZE", str(50 * 1024 * 1024)))
    if file.size and file.size > max_file_size:
        logger.error(f"File size too large: {file.size} bytes")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Video file size must be less than {max_file_size // (1024 * 1024)}MB",
        )

    try:
        video_content = await file.read()

        if not video_content:
            logger.error("Failed to read video content or file is empty")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to read video file or file is empty",
            )

        try:
            global_context_service = GlobalEvalService(video=video_content)
            config = global_context_service.evaluate()

            if not config:
                logger.error("Global evaluation service returned empty configuration")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Unable to extract context from video file",
                )

            logger.info(
                f"Successfully extracted context for video file: {file.filename}"
            )

            try:
                session_id = await redis_service.store_session(config)
                logger.info(f"Session {session_id} created for video: {file.filename}")
                return {
                    "session_id": session_id,
                    "message": "Video analysis completed successfully",
                    "expires_in": redis_service.session_ttl,
                }
            except Exception as redis_error:
                logger.error(f"Failed to store session in Redis: {redis_error}")
                logger.warning("Falling back to returning configuration directly")
                return {
                    "session_id": None,
                    "config": config,
                    "message": "Video analysis completed, but session storage failed",
                    "warning": "Session not stored - using direct response",
                }

        except Exception as service_error:
            logger.error(f"Global evaluation service error: {service_error}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Failed to process video file. The video may be corrupted or in an unsupported format.",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing video file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing the video file",
        )


@app.websocket("/ws/music")
async def music_websocket_endpoint(websocket: WebSocket, token: str):
    try:
        await get_ws_token(token)
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    logger.info("WebSocket connection accepted")

    try:
        message = await websocket.receive_text()
        data = json.loads(message)

        if "session_id" not in data:
            logger.error("Missing session_id in WebSocket message")
            await websocket.close(code=1003, reason="session_id is required")
            return

        try:
            session_id = data["session_id"]
            llm_response = await redis_service.get_session(session_id)

            if llm_response is None:
                logger.error(f"Session {session_id} not found or expired")
                await websocket.close(code=1003, reason="Session not found or expired")
                return

            await redis_service.extend_session_ttl(session_id)
            logger.info(f"Retrieved and extended session {session_id}")

        except Exception as e:
            logger.error("Could not fetch session values from redis: %s", e)
            await websocket.close(code=1003, reason="Failed to retrieve session data")
            return

        await websocket.send_text(
            json.dumps(
                {
                    "type": "session_data",
                    "data": redis_service._llm_response_to_dict(llm_response),
                }
            )
        )

        lyria_service = LyriaService(
            user_websocket=websocket, llm_response=llm_response
        )
        await lyria_service.start_session()

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
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "false").lower() == "true",
    )
