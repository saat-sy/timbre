from io import BytesIO
import base64
from typing import Optional
import cv2
import numpy as np
from scenedetect import detect, ContentDetector
from PIL import Image
from models.frame import Frame
from shared.logging import get_logger
from utils.helper.helper_utils import HelperUtils

logger = get_logger(__name__)


class VideoUtils:
    def __init__(self, temp_video_path: str) -> None:
        self.helper_utils = HelperUtils()
        self.temp_video_path = temp_video_path

    def get_unique_frames(self, start_duration: Optional[float] = None, end_duration: Optional[float] = None) -> list[Frame]:
        try:
            logger.info("Getting unique frames from video")
            self.global_eval = True
            if start_duration is not None or end_duration is not None:
                self.global_eval = False
                self.temp_video_path = self.helper_utils.trim_video(
                    video_path=self.temp_video_path,
                    start_duration=start_duration if start_duration is not None else 0.0,
                    end_duration=end_duration if end_duration is not None else float('inf'),
                )
            self._extract_scenes_from_video()
            best_frames = self._pick_best_frame_from_scene()
            unique_frames = self._deduplicate_frames(best_frames)
            return unique_frames
        except Exception as e:
            logger.error(f"Error in get_unique_frames: {e}")
            return []
        finally:
            self.helper_utils.cleanup_temp_file(self.temp_video_path)

    def _pick_best_frame_from_scene(self) -> list[Frame]:
        logger.info("Picking best frames from scenes")

        best_frames = []
        cap = cv2.VideoCapture(self.temp_video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)

        try:
            if not self.global_eval:
                logger.info("Getting frame for every second")
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                duration = total_frames / fps

                for second in range(int(duration) + 1):
                    frame_num = int(second * fps)
                    if frame_num >= total_frames:
                        break
                        
                    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
                    ret, frame = cap.read()
                    
                    if ret:
                        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
                        frame_data = base64.b64encode(buffer.tobytes()).decode('utf-8')
                        frame_obj = Frame(data=frame_data, timestamp=second)
                        best_frames.append(frame_obj)
                        logger.info(f"Selected frame at {second}s")

                logger.info(f"Selected {len(best_frames)} frames for realtime evaluation")

                return best_frames 

            for scene_start_tc, scene_end_tc in self.scenes:
                logger.info(f"Processing scene from {scene_start_tc} to {scene_end_tc}")

                start_frame = int(scene_start_tc * fps)
                end_frame = int(scene_end_tc * fps)

                best_frame = None
                middle_frame = (start_frame + end_frame) // 2
                cap.set(cv2.CAP_PROP_POS_FRAMES, middle_frame)
                ret, frame = cap.read()

                if ret:
                    _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
                    frame_data = base64.b64encode(buffer.tobytes()).decode('utf-8')
                    timestamp = middle_frame / fps
                    best_frame = Frame(data=frame_data, timestamp=timestamp)
                    best_frames.append(best_frame)
                    logger.info(f"Selected middle frame at {timestamp:.2f}s for scene {scene_start_tc:.2f}s-{scene_end_tc:.2f}s")
        finally:
            cap.release()

        logger.info(
            f"Selected {len(best_frames)} best frames from {len(self.scenes)} scenes"
        )
        return best_frames

    def _deduplicate_frames(
        self, frames: list[Frame], threshold: float = 0.9
    ) -> list[Frame]:
        logger.info("Deduplicating frames")
        unique_frames = []
        unique_images = []

        for frame in frames:
            image_bytes = base64.b64decode(frame.data)
            image = Image.open(BytesIO(image_bytes)).convert("RGB")
            image_np = np.array(image)

            is_duplicate = False
            for i, prev_image in enumerate(unique_images):
                similarity = self._calculate_image_similarity(prev_image, image_np)
                if similarity >= threshold:
                    logger.info(
                        f"Frame at {frame.timestamp:.2f}s is similar to frame at {unique_frames[i].timestamp:.2f}s (similarity: {similarity:.2f}), skipping"
                    )
                    is_duplicate = True
                    break

            if not is_duplicate:
                unique_frames.append(frame)
                unique_images.append(image_np)
                logger.info(f"Frame at {frame.timestamp:.2f}s added as unique frame")

        logger.info(
            f"Reduced from {len(frames)} to {len(unique_frames)} unique frames after deduplication"
        )
        return unique_frames

    def _calculate_image_similarity(self, img1: np.ndarray, img2: np.ndarray) -> float:
        img1_gray = cv2.cvtColor(img1, cv2.COLOR_RGB2GRAY)
        img2_gray = cv2.cvtColor(img2, cv2.COLOR_RGB2GRAY)

        hist1 = cv2.calcHist([img1_gray], [0], None, [256], [0, 256])
        hist2 = cv2.calcHist([img2_gray], [0], None, [256], [0, 256])

        hist1 = cv2.normalize(hist1, hist1).flatten()
        hist2 = cv2.normalize(hist2, hist2).flatten()

        similarity = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        return similarity

    def _extract_scenes_from_video(self) -> None:
        logger.info("Extracting scenes from video")
        scene_list = detect(self.temp_video_path, ContentDetector())
        self.scenes = []
        for scene_start, scene_end in scene_list:
            self.scenes.append((scene_start.get_seconds(), scene_end.get_seconds()))
        logger.info(f"Detected {len(self.scenes)} scenes in the video")

if __name__ == "__main__":
    import time
    start_time = time.time()
    video_path = "test.mp4"
    with open(video_path, "rb") as f:
        video_bytes = f.read()
    helper_utils = HelperUtils()
    temp_video_path = helper_utils.create_temp_file(video=video_bytes)
    video_utils = VideoUtils(temp_video_path=temp_video_path)
    frames = video_utils.get_unique_frames(start_duration=10.0, end_duration=10.0)
    end_time = time.time()
    logger.info(f"Extracted {len(frames)} unique frames in {end_time - start_time:.2f} seconds")