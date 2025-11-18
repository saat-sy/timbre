import os
import time
from shared.logging import get_logger

logger = get_logger(__name__)


class HelperUtils:
    def create_temp_file(self, video: bytes) -> str:
        logger.info("Creating temporary video file")
        timestamp = int(time.time() * 1000)
        temp_video_path = f"/tmp/temp_video_{timestamp}.mp4"
        with open(temp_video_path, "wb") as temp_video_file:
            temp_video_file.write(video)
        logger.info(f"Temporary video file created at {temp_video_path}")
        return temp_video_path

    def cleanup_temp_file(self, temp_video_path: str) -> None:
        logger.info("Cleaning up temporary video file")
        try:
            os.remove(temp_video_path)
            logger.info(f"Temporary video file {temp_video_path} removed")
        except Exception as e:
            logger.error(f"Error removing temporary video file: {e}")

    def trim_video(self, video_path: str, start_duration: float, end_duration: float) -> str:
        logger.info("Trimming video")
        timestamp = int(time.time() * 1000)
        trimmed_video_path = f"/tmp/trimmed_video_{timestamp}.mp4"

        start_time_str = f"{start_duration}" if start_duration is not None else "0"
        end_time_str = f"{end_duration}" if end_duration is not None else ""

        command = f"ffmpeg -i {video_path} -ss {start_time_str} "
        if end_duration is not None:
            command += f"-to {end_time_str} "
        command += f"-c copy {trimmed_video_path} -y"

        os.system(command)
        logger.info(f"Video trimmed and saved to {trimmed_video_path}")
        return trimmed_video_path
