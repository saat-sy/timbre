from strands import tool
import boto3
import json
import base64
import cv2
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

def _extract_frame(video_path: str, time: str) -> str:
    """
    Extract a frame from video at specified time using OpenCV.
    
    Args:
        video_path (str): Path to the video file
        time (str): Timestamp to extract frame from (e.g., '00:01:23.456' or seconds as float)
    
    Returns:
        str: Path to the extracted frame image file
    
    Raises:
        Exception: If frame extraction fails
    """
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_image:
        temp_image_path = temp_image.name
    
    try:
        if ':' in time:
            parts = time.split(':')
            seconds = float(parts[-1])
            if len(parts) > 1:
                seconds += int(parts[-2]) * 60
            if len(parts) > 2:
                seconds += int(parts[-3]) * 3600
        else:
            seconds = float(time)
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise Exception(f"Could not open video file: {video_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_number = int(seconds * fps)
        
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        
        ret, frame = cap.read()
        if not ret:
            raise Exception(f"Could not read frame at time {time}")
        
        success = cv2.imwrite(temp_image_path, frame)
        if not success:
            raise Exception(f"Could not save frame to {temp_image_path}")
        
        cap.release()
        return temp_image_path
        
    except Exception as e:
        if os.path.exists(temp_image_path):
            os.unlink(temp_image_path)
        raise Exception(f"Frame extraction failed: {str(e)}")

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
        
        temp_image_path = _extract_frame(local_video_path, time)
        
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
    
if __name__ == "__main__":
    # Example usage
    video_s3_path = "s3://timbre-backend-uploadsbucket-6shpqasrggsz/uploads/c8c1a370-70b1-7030-90f9-9258e574977a/10489970-6aeb-4a78-85cb-3acbbe218cae-test.mp4"
    timestamp = "00:00:10.000"
    description = describe_image(time=timestamp, video_path=video_s3_path)
    print("Image Description:", description)
