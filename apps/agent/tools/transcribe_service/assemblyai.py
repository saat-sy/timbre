import os
import requests
import time
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv('ASSEMBLY_AI_API_KEY')
UPLOAD_ENDPOINT = 'https://api.assemblyai.com/v2/upload'
TRANSCRIPT_ENDPOINT = f'https://api.assemblyai.com/v2/transcript'
HEADERS = {'authorization': API_KEY}

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

if __name__ == "__main__":
    audio_path = "tools/test.mp3"
    print(get_transcription_from_assemblyai(audio_path))