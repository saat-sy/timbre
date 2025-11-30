from io import BytesIO
import base64
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import partial
import cv2
import numpy as np
from scenedetect import detect, ContentDetector
from PIL import Image
from models.frame import Frame
from shared.logging import get_logger
from utils.helper.helper_utils import HelperUtils

logger = get_logger(__name__)


class VideoUtils:
    def __init__(self, temp_video_path: str, max_workers: int = 8) -> None:
        self.helper_utils = HelperUtils()
        self.temp_video_path = temp_video_path
        self.max_workers = max_workers

    def get_unique_frames(
        self,
        start_duration: Optional[float] = None,
        end_duration: Optional[float] = None,
    ) -> list[Frame]:
        try:
            logger.info("Getting unique frames from video")
            self.global_eval = True
            if start_duration is not None or end_duration is not None:
                self.global_eval = False
                self.temp_video_path = self.helper_utils.trim_video(
                    video_path=self.temp_video_path,
                    start_duration=(
                        start_duration if start_duration is not None else 0.0
                    ),
                    end_duration=(
                        end_duration if end_duration is not None else float("inf")
                    ),
                )
            self._extract_scenes_from_video()
            best_frames = self._pick_best_frame_from_scene()
            unique_frames = self._deduplicate_frames(best_frames)
            resized_frames = self._resize_frames_parallel(unique_frames, max_width=540)
            return resized_frames
        except Exception as e:
            logger.error(f"Error in get_unique_frames: {e}")
            return []
        finally:
            self.helper_utils.cleanup_temp_file(self.temp_video_path)

    def _pick_best_frame_from_scene(self) -> list[Frame]:
        logger.info("Picking best frames from scenes")

        cap = cv2.VideoCapture(self.temp_video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        cap.release()

        if not self.global_eval:
            logger.info("Getting frame for every second")
            cap_temp = cv2.VideoCapture(self.temp_video_path)
            total_frames = int(cap_temp.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = total_frames / fps
            cap_temp.release()

            seconds = list(range(int(duration) + 1))

            with ThreadPoolExecutor(
                max_workers=min(self.max_workers, len(seconds))
            ) as executor:
                extract_func = partial(
                    self._extract_frame_at_second, fps=fps, total_frames=total_frames
                )
                futures = {
                    executor.submit(extract_func, second): second for second in seconds
                }

                best_frames = []
                for future in as_completed(futures):
                    frame_obj = future.result()
                    if frame_obj:
                        best_frames.append(frame_obj)

            best_frames.sort(key=lambda x: x.timestamp)
            logger.info(f"Selected {len(best_frames)} frames for realtime evaluation")
            return best_frames

        with ThreadPoolExecutor(
            max_workers=min(self.max_workers, len(self.scenes))
        ) as executor:
            extract_func = partial(self._extract_frame_from_scene, fps=fps)
            futures = {
                executor.submit(extract_func, scene): scene for scene in self.scenes
            }

            best_frames = []
            for future in as_completed(futures):
                frame_obj = future.result()
                if frame_obj:
                    best_frames.append(frame_obj)

        best_frames.sort(key=lambda x: x.timestamp)
        logger.info(
            f"Selected {len(best_frames)} best frames from {len(self.scenes)} scenes"
        )
        return best_frames

    def _deduplicate_frames(
        self, frames: list[Frame], threshold: float = 0.9
    ) -> list[Frame]:
        logger.info("Deduplicating frames")

        if not frames:
            return []

        with ThreadPoolExecutor(
            max_workers=min(self.max_workers, len(frames))
        ) as executor:
            futures = {
                executor.submit(self._frame_to_numpy, frame): frame for frame in frames
            }
            frame_images = []

            for future in as_completed(futures):
                frame = futures[future]
                image_np = future.result()
                if image_np is not None:
                    frame_images.append((frame, image_np))

        frame_images.sort(key=lambda x: x[0].timestamp)

        unique_frames = []
        unique_images = []

        for frame, image_np in frame_images:
            is_duplicate = False

            if len(unique_images) > 0:
                with ThreadPoolExecutor(
                    max_workers=min(4, len(unique_images))
                ) as executor:
                    similarity_futures = [
                        executor.submit(
                            self._calculate_image_similarity, prev_image, image_np
                        )
                        for prev_image in unique_images
                    ]

                    for i, future in enumerate(similarity_futures):
                        similarity = future.result()
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

    def _frame_to_numpy(self, frame: Frame) -> Optional[np.ndarray]:
        """Convert frame data to numpy array - thread-safe method"""
        try:
            image_bytes = base64.b64decode(frame.data)
            image = Image.open(BytesIO(image_bytes)).convert("RGB")
            return np.array(image)
        except Exception as e:
            logger.error(f"Error converting frame to numpy: {e}")
            return None

    def _calculate_image_similarity(self, img1: np.ndarray, img2: np.ndarray) -> float:
        img1_gray = cv2.cvtColor(img1, cv2.COLOR_RGB2GRAY)
        img2_gray = cv2.cvtColor(img2, cv2.COLOR_RGB2GRAY)

        hist1 = cv2.calcHist([img1_gray], [0], None, [256], [0, 256])
        hist2 = cv2.calcHist([img2_gray], [0], None, [256], [0, 256])

        hist1 = cv2.normalize(hist1, hist1).flatten()
        hist2 = cv2.normalize(hist2, hist2).flatten()

        similarity = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        return similarity

    def _resize_frames_parallel(
        self, frames: list[Frame], max_width: int = 540
    ) -> list[Frame]:
        logger.info(f"Resizing {len(frames)} frames to max width {max_width}px")

        if not frames:
            return []

        with ThreadPoolExecutor(
            max_workers=min(self.max_workers, len(frames))
        ) as executor:
            futures = {
                executor.submit(self._resize_single_frame, frame, max_width): frame
                for frame in frames
            }
            resized_frames = []

            for future in as_completed(futures):
                original_frame = futures[future]
                resized_frame = future.result()
                if resized_frame:
                    resized_frames.append(resized_frame)
                else:
                    resized_frames.append(original_frame)

        resized_frames.sort(key=lambda x: x.timestamp)
        logger.info(f"Successfully resized {len(resized_frames)} frames")
        return resized_frames

    def _resize_single_frame(self, frame: Frame, max_width: int) -> Optional[Frame]:
        """Resize a single frame to max width while maintaining aspect ratio - thread-safe method"""
        try:
            image_bytes = base64.b64decode(frame.data)
            image = Image.open(BytesIO(image_bytes))

            width, height = image.size

            if width > max_width:
                aspect_ratio = height / width
                new_width = max_width
                new_height = int(max_width * aspect_ratio)

                resized_image = image.resize(
                    (new_width, new_height), Image.Resampling.LANCZOS
                )
                logger.debug(
                    f"Resized frame from {width}x{height} to {new_width}x{new_height}"
                )
            else:
                resized_image = image
                logger.debug(
                    f"Frame {width}x{height} already within max width, no resize needed"
                )

            buffer = BytesIO()
            resized_image.save(buffer, format="JPEG", quality=95)
            resized_data = base64.b64encode(buffer.getvalue()).decode("utf-8")

            resized_frame = Frame(
                data=resized_data,
                timestamp=frame.timestamp,
                scene_start=frame.scene_start,
                scene_end=frame.scene_end,
            )

            return resized_frame

        except Exception as e:
            logger.error(f"Error resizing frame at timestamp {frame.timestamp}: {e}")
            return None

    def _extract_scenes_from_video(self) -> None:
        logger.info("Extracting scenes from video")
        scene_list = detect(self.temp_video_path, ContentDetector())
        self.scenes = []
        if not scene_list:
            cap = cv2.VideoCapture(self.temp_video_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            self.scenes.append((0.0, total_frames / fps))
        for scene_start, scene_end in scene_list:
            self.scenes.append((scene_start.get_seconds(), scene_end.get_seconds()))
        logger.info(f"Detected {len(self.scenes)} scenes in the video")

    def _extract_frame_at_second(
        self, second: int, fps: float, total_frames: int
    ) -> Optional[Frame]:
        """Extract frame at specific second - thread-safe method"""
        frame_num = int(second * fps)
        if frame_num >= total_frames:
            return None

        cap = cv2.VideoCapture(self.temp_video_path)
        try:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()

            if ret:
                _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
                frame_data = base64.b64encode(buffer.tobytes()).decode("utf-8")
                frame_obj = Frame(
                    data=frame_data,
                    timestamp=second,
                    scene_start=second,
                    scene_end=second,
                )
                logger.info(f"Selected frame at {second}s")
                return frame_obj
        finally:
            cap.release()
        return None

    def _extract_frame_from_scene(self, scene: tuple, fps: float) -> Optional[Frame]:
        """Extract middle frame from scene - thread-safe method"""
        scene_start_tc, scene_end_tc = scene
        logger.info(f"Processing scene from {scene_start_tc} to {scene_end_tc}")

        start_frame = int(scene_start_tc * fps)
        end_frame = int(scene_end_tc * fps)
        middle_frame = (start_frame + end_frame) // 2

        cap = cv2.VideoCapture(self.temp_video_path)
        try:
            cap.set(cv2.CAP_PROP_POS_FRAMES, middle_frame)
            ret, frame = cap.read()

            if ret:
                _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
                frame_data = base64.b64encode(buffer.tobytes()).decode("utf-8")
                timestamp = middle_frame / fps
                frame_obj = Frame(
                    data=frame_data,
                    timestamp=timestamp,
                    scene_start=scene_start_tc,
                    scene_end=scene_end_tc,
                )
                logger.info(
                    f"Selected middle frame at {timestamp:.2f}s for scene {scene_start_tc:.2f}s-{scene_end_tc:.2f}s"
                )
                return frame_obj
        finally:
            cap.release()
        return None


if __name__ == "__main__":
    import time

    start_time = time.time()
    video_path = "test.mp4"
    with open(video_path, "rb") as f:
        video_bytes = f.read()
    helper_utils = HelperUtils()
    temp_video_path = helper_utils.create_temp_file(video=video_bytes)
    video_utils = VideoUtils(temp_video_path=temp_video_path)
    frames = video_utils.get_unique_frames()
    end_time = time.time()
    logger.info(
        f"Extracted {len(frames)} unique frames in {end_time - start_time:.2f} seconds"
    )
