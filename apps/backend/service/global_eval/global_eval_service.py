import concurrent.futures
from models.llm_response import LLMResponse
from shared.logging import get_logger
from utils.audio.audio_utils import AudioUtils
from utils.helper.helper_utils import HelperUtils
from utils.llm.global_llm_utils import LLMUtils
from utils.video.video_utils import VideoUtils

logger = get_logger(__name__)


class GlobalEvalService:
    def __init__(self, video: bytes) -> None:
        self.video = video
        self.helper_utils = HelperUtils()
        self.audio_utils = AudioUtils()
        self.temp_video_path = self.helper_utils.create_temp_file(video=video)
        self.video_utils = VideoUtils(self.temp_video_path)
        self.llm_utils = LLMUtils()

    def evaluate(self) -> LLMResponse:
        try:
            logger.info("Starting global evaluation of the video.")

            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                transcription_future = executor.submit(
                    self.audio_utils.get_transcription, video_bytes=self.video
                )
                frames_future = executor.submit(self.video_utils.get_unique_frames)

                transcriptions = transcription_future.result()
                frames = frames_future.result()

            response = self.llm_utils.get_global_config(
                transcript=transcriptions, frames=frames
            )

            logger.info("Global evaluation completed.")

            return response
        except Exception as e:
            logger.error(f"Error during global evaluation: {e}")
            raise e


if __name__ == "__main__":
    import time

    start_time = time.time()
    with open("test.mp4", "rb") as f:
        video_data = f.read()
    global_eval_service = GlobalEvalService(video=video_data)
    response = global_eval_service.evaluate()
    print("\n\n")
    logger.info(f"Scene Analysis: {response.scene_analysis}")
    print("\n\n")
    logger.info(f"Master Plan: {response.master_plan}")
    print("\n\n")
    logger.info(f"Total evaluation time: {time.time() - start_time} seconds")
