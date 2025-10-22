from scenedetect import detect, AdaptiveDetector
from strands import tool
import boto3
import tempfile
import os
from urllib.parse import urlparse

def _validate_input(video_path):
    """Validate input parameters"""
    if not video_path:
        raise ValueError("video_path cannot be empty")
    if video_path.startswith('s3://'):
        s3_client = boto3.client('s3')
        s3_path = video_path[5:]
        bucket, key = s3_path.split('/', 1)
        try:
            s3_client.head_object(Bucket=bucket, Key=key)
        except s3_client.exceptions.NoSuchKey:
            raise ValueError(f"S3 object does not exist: {video_path}")
        except Exception as e:
            raise ValueError(f"Error accessing S3 object: {e}")
    else:
        if not os.path.exists(video_path):
            raise ValueError(f"Local video file does not exist: {video_path}")
        if not os.path.isfile(video_path):
            raise ValueError(f"Path is not a file: {video_path}")

def _download_s3_file(s3_url):
    """Download S3 file to temporary location"""
    parsed = urlparse(s3_url)
    bucket = parsed.netloc
    key = parsed.path.lstrip('/')
    
    s3_client = boto3.client('s3')
    
    file_extension = os.path.splitext(key)[1] or '.mp4'
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
    temp_path = temp_file.name
    temp_file.close()
    
    s3_client.download_file(bucket, key, temp_path)
    return temp_path
    
def _process_scene_list(scene_list):
    """Process scene list to return start and end times"""
    return [
        {'start': round(scene[0].get_seconds(), 2), 'end': round(scene[1].get_seconds(), 2)}
        for scene in scene_list
    ]

@tool
def get_scene_list(video_path: str) -> list:
    """
    Extracts the scene list from a video file.

    Args:
        video_path (str): The path to the video file (local path or S3 URL)

    Returns:
        list: A list of scene objects.
    """
    temp_path = None
    try:
        _validate_input(video_path)
        if video_path.startswith('s3://'):
            temp_path = _download_s3_file(video_path)
            scene_list = detect(temp_path, AdaptiveDetector())
        else:
            scene_list = detect(video_path, AdaptiveDetector())
        
        return _process_scene_list(scene_list)
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)