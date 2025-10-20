from strands import tool
import boto3
import uuid
import time
import json
import urllib.request

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
    """Extract transcription filename from video path"""
    video_filename = video_path.split('/')[-1]
    base_name = video_filename.rsplit('.', 1)[0]
    return f"{base_name}.json"

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
        
        return _parse_transcript_data(transcript_data)
        
    except s3_client.exceptions.NoSuchKey:
        return None
    except Exception as e:
        print(f"Warning: Could not read existing transcription: {e}")
        return None

def _parse_transcript_data(transcript_data):
    """Parse AWS Transcribe response data into structured format"""
    words = []
    if 'results' in transcript_data and 'items' in transcript_data['results']:
        for item in transcript_data['results']['items']:
            if item['type'] == 'pronunciation':
                words.append({
                    'text': item['alternatives'][0]['content'],
                    'start_time': float(item['start_time']),
                    'end_time': float(item['end_time']),
                    'confidence': float(item['alternatives'][0]['confidence'])
                })
    
    sentences = []
    if words:
        current_sentence = {
            'words': [],
            'start_time': words[0]['start_time'],
            'end_time': words[0]['end_time'],
            'confidence_sum': 0,
            'word_count': 0
        }
        
        for word in words:
            current_sentence['words'].append(word['text'])
            current_sentence['end_time'] = word['end_time']
            current_sentence['confidence_sum'] += word['confidence']
            current_sentence['word_count'] += 1
            
            if (word['text'].endswith(('.', '!', '?')) or 
                len(current_sentence['words']) >= 15):
                
                sentences.append({
                    'text': ' '.join(current_sentence['words']),
                    'start_time': current_sentence['start_time'],
                    'end_time': current_sentence['end_time'],
                    'confidence': current_sentence['confidence_sum'] / current_sentence['word_count'],
                    'word_count': current_sentence['word_count']
                })
                
                if word != words[-1]:
                    next_word_idx = words.index(word) + 1
                    if next_word_idx < len(words):
                        current_sentence = {
                            'words': [],
                            'start_time': words[next_word_idx]['start_time'],
                            'end_time': words[next_word_idx]['end_time'],
                            'confidence_sum': 0,
                            'word_count': 0
                        }
        
        if current_sentence['words']:
            sentences.append({
                'text': ' '.join(current_sentence['words']),
                'start_time': current_sentence['start_time'],
                'end_time': current_sentence['end_time'],
                'confidence': current_sentence['confidence_sum'] / current_sentence['word_count'],
                'word_count': current_sentence['word_count']
            })
    
    return {
        'transcripts': sentences,
        'full_text': ' '.join([sentence['text'] for sentence in sentences])
    }

def _wait_for_transcription_completion(transcribe_client, job_name):
    """Wait for transcription job to complete and return processed results"""
    max_wait_time = 300
    start_time = time.time()
    
    while True:
        if time.time() - start_time > max_wait_time:
            raise Exception(f"Transcription job timed out after 5 minutes")
        
        response = transcribe_client.get_transcription_job(
            TranscriptionJobName=job_name
        )
        status = response['TranscriptionJob']['TranscriptionJobStatus']
        
        if status == 'COMPLETED':
            transcript_uri = response['TranscriptionJob']['Transcript']['TranscriptFileUri']
            
            with urllib.request.urlopen(transcript_uri) as response:
                transcript_data = json.loads(response.read().decode())
            
            return _parse_transcript_data(transcript_data)
            
        elif status == 'FAILED':
            failure_reason = response['TranscriptionJob'].get('FailureReason', 'Unknown error')
            raise Exception(f"Transcription job failed: {failure_reason}")
        
        time.sleep(5)

@tool
def transcribe(video_path: str) -> dict:
    """
    Transcribes the audio from a video file using AWS Transcribe.

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

    transcribe_client = boto3.client('transcribe')
    
    job_name = f"transcribe_job_{uuid.uuid4().hex[:8]}"
    
    video_filename = video_path.split('/')[-1] 
    base_name = video_filename.rsplit('.', 1)[0]
    output_filename = f"{base_name}.json"
    
    try:
        transcribe_client.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': video_path},
            MediaFormat=video_filename.rsplit('.', 1)[-1],
            LanguageCode='en-US',
            Settings={
                'ShowSpeakerLabels': True,
                'MaxSpeakerLabels': 10
            },
            OutputBucketName=video_path.split('/')[2],
            OutputKey=f"transcriptions/{output_filename}"
        )
        
        result = _wait_for_transcription_completion(transcribe_client, job_name)
        
        transcribe_client.delete_transcription_job(TranscriptionJobName=job_name)
        
        return result
            
    except Exception as e:
        try:
            transcribe_client.delete_transcription_job(TranscriptionJobName=job_name)
        except:
            pass
        raise Exception(f"Transcription failed: {str(e)}")

