from strands import tool
import boto3
import json
import base64
import subprocess
import tempfile
import os
from urllib.parse import urlparse

def _validate_input_and_get_local_path(video_path):
    """Validate input parameters and return local video path"""
    if not video_path:
        raise ValueError("video_path cannot be empty")
    
    if video_path.startswith('s3://'):
        s3_client = boto3.client('s3')
        parsed_url = urlparse(video_path)
        bucket = parsed_url.netloc
        key = parsed_url.path.lstrip('/')
        
        try:
            s3_client.head_object(Bucket=bucket, Key=key)
        except s3_client.exceptions.NoSuchKey:
            raise ValueError(f"S3 object does not exist: {video_path}")
        except Exception as e:
            raise ValueError(f"Error accessing S3 object: {e}")
        
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_video:
            s3_client.download_fileobj(bucket, key, temp_video)
            return temp_video.name
    else:
        if not os.path.exists(video_path):
            raise ValueError(f"Local video file does not exist: {video_path}")
        if not os.path.isfile(video_path):
            raise ValueError(f"Path is not a file: {video_path}")
        return video_path

@tool
def describe_image(time: str, video_path: str) -> str:
    """
    Extracts the frame at time and uses a multi-modal model to describe the image.

    Args:
        time (str): The timestamp of the frame to describe (e.g., '00:01:23.456').
        video_path (str): The path to the video file (e.g., 's3://bucket-name/video.mp4').

    Returns:
        str: A textual description of the image.
    """
    try:
        bedrock_client = boto3.client('bedrock-runtime', region_name='us-west-2')
        
        local_video_path = _validate_input_and_get_local_path(video_path)
        
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_image:
            temp_image_path = temp_image.name
        
        ffmpeg_command = [
            'ffmpeg',
            '-i', local_video_path,
            '-ss', time,
            '-vframes', '1',
            '-y',
            temp_image_path
        ]
        
        result = subprocess.run(ffmpeg_command, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"FFmpeg failed: {result.stderr}")
        
        with open(temp_image_path, 'rb') as image_file:
            image_data = image_file.read()
            image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        system_list = [
            {
                "text": "Please provide a detailed description of this image, including the scene, objects, people, mood, lighting, colors, and any notable visual elements that would be relevant for understanding the context of this video frame."
            }
        ]

        message_list = [
            {
                "role": "user",
                "content": [
                    {
                        "image": {
                            "format": "jpeg",
                            "source": {
                                "bytes": image_base64
                            }
                        }
                    },
                    {
                        "text": "Describe this image in detail."
                    }
                ]
            }
        ]

        native_request = {
            "schemaVersion": "messages-v1",
            "messages": message_list,
            "system": system_list,
            "inferenceConfig": {
                "max_new_tokens": 1000
            }
        }
        
        response = bedrock_client.invoke_model(
            modelId='us.amazon.nova-pro-v1:0',
            body=json.dumps(native_request)
        )
        
        response_body = json.loads(response['body'].read())
        description = response_body['output']['message']['content'][0]['text']
        
        try:
            if video_path.startswith('s3://'):
                os.unlink(local_video_path)
            os.unlink(temp_image_path)
        except:
            pass
        
        return description
        
    except Exception as e:
        return f"Error describing image: {str(e)}"
