from strands import tool
import boto3
import uuid
import json
import os
import subprocess
import requests
import time
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv('ASSEMBLY_AI_API_KEY')
UPLOAD_ENDPOINT = 'https://api.assemblyai.com/v2/upload'
TRANSCRIPT_ENDPOINT = f'https://api.assemblyai.com/v2/transcript'
HEADERS = {'authorization': API_KEY}

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
        
def _get_transcription_filename(video_path):
    """Generates a transcription filename based on the video filename"""
    video_filename = video_path.split('/')[-1] 
    base_name = video_filename.rsplit('.', 1)[0]
    return f"{base_name}.json"

def _upload_transcription_to_s3(transcript_data, video_path):
    """Uploads transcription data to S3"""
    s3_client = boto3.client('s3')
    bucket = video_path.split('/')[2]
    
    transcription_filename = _get_transcription_filename(video_path)
    transcription_key = f"transcriptions/{transcription_filename}"
    
    s3_client.put_object(
        Bucket=bucket,
        Key=transcription_key,
        Body=json.dumps(transcript_data).encode('utf-8'),
        ContentType='application/json'
    )

def _check_existing_transcription(video_path):
    """Check if transcription already exists in S3"""
    s3_client = boto3.client('s3')
    bucket = video_path.split('/')[2]
    
    transcription_filename = _get_transcription_filename(video_path)
    transcription_key = f"transcriptions/{transcription_filename}"
    
    try:
        s3_client.head_object(Bucket=bucket, Key=transcription_key)
        
        response = s3_client.get_object(Bucket=bucket, Key=transcription_key)
        transcript_data = json.loads(response['Body'].read().decode())
        
        return transcript_data
        
    except s3_client.exceptions.NoSuchKey:
        return None
    except Exception as e:
        print(f"Warning: Could not read existing transcription: {e}")
        return None
    
def _get_converted_audio_from_video(video_path):
    """Extracts and converts audio from video file to a local temporary file using ffmpeg"""   
    s3 = boto3.client('s3')
    temp_video_path = f"/tmp/{uuid.uuid4()}.mp4"
    
    if video_path.startswith('s3://'):
        s3_path = video_path[5:]
        bucket, key = s3_path.split('/', 1)
        s3.download_file(bucket, key, temp_video_path)
    else:
        temp_video_path = video_path
    
    audio_path = f"/tmp/{uuid.uuid4()}.mp3"
    
    try:
        subprocess.run([
            'ffmpeg', 
            '-i', temp_video_path,
            '-vn',
            '-acodec', 'mp3',
            '-ab', '192k',
            '-ar', '44100',
            '-y',
            audio_path
        ], check=True, capture_output=True, text=True)
        
    except subprocess.CalledProcessError as e:
        raise Exception(f"ffmpeg failed to extract audio: {e.stderr}")
    except FileNotFoundError:
        raise Exception("ffmpeg not found. Please install ffmpeg on your system.")
    
    if video_path.startswith('s3://'):
        try:
            os.remove(temp_video_path)
        except OSError:
            raise Exception("Warning: Could not delete temporary video file")
    
    return audio_path

def _upload_audio(file_path: str) -> str:
    """Uploads audio file to AssemblyAI and returns upload URL."""
    with open(file_path, 'rb') as f:
        response = requests.post(UPLOAD_ENDPOINT, headers=HEADERS, data=f)
    response.raise_for_status()
    return response.json()['upload_url']

def _request_transcription(audio_url: str) -> str:
    """Requests transcription and returns transcript ID."""
    json_data = {
        "audio_url": audio_url
    }
    response = requests.post(TRANSCRIPT_ENDPOINT, headers=HEADERS, json=json_data)
    response.raise_for_status()
    return response.json()['id']

def _wait_for_completion(transcript_id: str):
    """Polls transcription status until finished, then returns full transcript JSON."""
    while True:
        url = f"{TRANSCRIPT_ENDPOINT}/{transcript_id}"
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        data = response.json()
        if data['status'] == 'completed':
            sentences = requests.get(f"{TRANSCRIPT_ENDPOINT}/{transcript_id}/sentences", headers=HEADERS)
            return sentences.json()
        elif data['status'] == 'error':
            raise RuntimeError(f"Transcription failed: {data.get('error')}")
        time.sleep(5)

def _ms_to_timestamp(ms: int) -> str:
    """Converts milliseconds to HH:MM:SS:MMMM format."""
    hours = ms // 3600000
    minutes = (ms % 3600000) // 60000
    seconds = (ms % 60000) // 1000
    milliseconds = ms % 1000
    return f"{hours:02}:{minutes:02}:{seconds:02}:{milliseconds:04}"

def _parse_sentences(transcription_json: dict) -> list:
    """Parses sentences with timestamps from transcription JSON."""
    parsed = []
    for sentence in transcription_json.get("sentences", []):
        parsed.append({
            "text": sentence["text"],
            "start": _ms_to_timestamp(sentence["start"]),
            "end": _ms_to_timestamp(sentence["end"])
        })
    return parsed

def get_transcription_from_assemblyai(audio_path: str) -> list:
    """Get transcription from AssemblyAI for the given audio file.

    Args:
        video_path (str): Path to the local temporary audio file.
        
    Returns:
        dict: Transcription result from AssemblyAI - sentences with timestamps
        example:
            {
                "text": "Transcribed text here...",
                "start": 95,
                "end": 100
                ...
            }
    """

    upload_url = _upload_audio(audio_path)
    transcript_id = _request_transcription(upload_url)
    transcript_result = _wait_for_completion(transcript_id)
    
    return _parse_sentences(transcript_result)

@tool
def transcribe(video_path: str) -> list:
    """
    Transcribes the audio from a video file using AssemblyAI.

    Args:
        video_path (str): The path to the video file (e.g., 's3://bucket-name/video.mp4').

    Returns:
        Mapping of transcripts with timestamps.
    """
    _validate_input(video_path)

    existing_transcription = _check_existing_transcription(video_path)
    if existing_transcription:
        print(f"Found existing transcription for {video_path}")
        return existing_transcription
    
    local_audio_path = None
    try:
        local_audio_path = _get_converted_audio_from_video(video_path)

        result = get_transcription_from_assemblyai(local_audio_path)

        _upload_transcription_to_s3(result, video_path)
        
        return result
            
    except Exception as e:
        raise Exception(f"Transcription failed: {str(e)}")
    finally:
        if local_audio_path and os.path.exists(local_audio_path):
            try:
                os.remove(local_audio_path)
            except OSError:
                print(f"Warning: Could not delete temporary audio file: {local_audio_path}")