from datetime import datetime, timezone
import boto3
import subprocess
import tempfile
import os
from urllib.parse import urlparse
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

from constants import EventFields, JobStatus
from utils import validate_event, update_field_in_dynamodb

s3_client = boto3.client('s3')

JOBS_TABLE = os.environ['JOBS_TABLE']
dynamodb_resource = boto3.client('dynamodb')
jobs_table = dynamodb_resource.Table(JOBS_TABLE)

def _parse_s3_url(s3_url):
    parsed = urlparse(s3_url)
    bucket = parsed.netloc
    key = parsed.path.lstrip('/')
    return bucket, key

def _download_from_s3(bucket, key, local_path):
    s3_client.download_file(bucket, key, local_path)

def _upload_to_s3(bucket, key, local_path):
    s3_client.upload_file(local_path, bucket, key)

def _combine_video_audio(video_file, audio_files, output_file):
    filter_complex = []
    input_args = ["-i", video_file]
    
    for i, audio in enumerate(audio_files):
        input_args.extend(["-i", audio["file"]])
        duration = audio["end"] - audio["start"]
        delay = int(audio["start"] * 1000)
        
        fade_duration = 0.5
        filter_complex.append(f"[{i+1}:a]volume=-25dB,afade=t=in:ss=0:d={fade_duration},afade=t=out:st={duration-fade_duration}:d={fade_duration},adelay={delay}|{delay}[delayed{i}]")
    
    if audio_files:
        if len(audio_files) > 1:
            mix_inputs = "".join([f"[delayed{i}]" for i in range(len(audio_files))])
            filter_complex.append(f"{mix_inputs}amix=inputs={len(audio_files)}:duration=longest[new_audio]")
            new_audio_stream = "[new_audio]"
        else:
            new_audio_stream = "[delayed0]"
        
        filter_complex.append(f"[0:a]{new_audio_stream}amix=inputs=2:duration=longest[final_audio]")
        
        cmd = [
            "ffmpeg", "-y"
        ] + input_args + [
            "-filter_complex", ";".join(filter_complex),
            "-map", "0:v",
            "-map", "[final_audio]",
            "-c:v", "copy",
            "-c:a", "aac",
            output_file
        ]
    else:
        cmd = [
            "ffmpeg", "-y",
            "-i", video_file,
            "-c", "copy",
            output_file
        ]
    
    logger.info("FFmpeg command:", " ".join(cmd))
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    if result.stderr:
        raise Exception("FFmpeg stderr: " + result.stderr)
    if result.stdout:
        raise Exception("FFmpeg stdout: " + result.stdout)

def lambda_handler(event, context):
    """
    Combines video with generated audio segments based on the provided plan.
    
    Args:
        event (dict): Event containing 'plan' and 'video_s3_path'.
        context: Lambda context (not used).
        
    Returns:
        dict: Updated event with 'final_url' and updated 'status'.
    """
    
    try:
        logger.info("AV Operator Lambda started")

        validate_event(
            event,
            required_fields=[EventFields.JOB_ID, EventFields.STATUS, EventFields.PLAN, EventFields.S3_URL]
        )

        job_id = event.get(EventFields.JOB_ID)
        plan = event.get(EventFields.PLAN)
        video_s3_path = event.get(EventFields.S3_URL)
        
        bucket_name, video_key = _parse_s3_url(video_s3_path)
        
        with tempfile.TemporaryDirectory() as temp_dir:
            video_file = os.path.join(temp_dir, "input_video.mp4")
            output_file = os.path.join(temp_dir, "output_video.mp4")
            
            _download_from_s3(bucket_name, video_key, video_file)
            
            audio_files = []
            for segment in plan:
                audio_file = os.path.join(temp_dir, f"audio_{segment['start']}.wav")
                audio_bucket, audio_key = _parse_s3_url(segment["audio_path"])
                _download_from_s3(audio_bucket, audio_key, audio_file)
                audio_files.append({
                    "file": audio_file,
                    "start": segment["start"],
                    "end": segment["end"]
                })
            
            _combine_video_audio(video_file, audio_files, output_file)
            
            output_key = f"final/{os.path.basename(video_key)}"
            _upload_to_s3(bucket_name, output_key, output_file)
            output_s3_url = f"s3://{bucket_name}/{output_key}"

            update_field_in_dynamodb(
                jobs_table,
                job_id,
                {
                    EventFields.STATUS: JobStatus.PROCESSED,
                    EventFields.FINAL_URL: output_s3_url,
                    EventFields.UPDATED_AT: datetime.now(timezone.utc).isoformat()
                }
            )
            event["final_url"] = output_s3_url
            event["status"] = JobStatus.PROCESSED
        return event
        
    except Exception as e:
        logger.error(f"Error in AV Operator Lambda: {e}")
        try:
            update_field_in_dynamodb(
                jobs_table,
                event.get(EventFields.JOB_ID, 'unknown'),
                {
                    EventFields.STATUS: JobStatus.FAILED,
                    EventFields.UPDATED_AT: datetime.now(timezone.utc).isoformat()
                }
            )
            event[EventFields.STATUS] = JobStatus.FAILED
        except Exception as db_error:
            logger.error(f"Failed to update job status in DynamoDB: {str(db_error)}")
        
        raise RuntimeError(f"Audio video process failed: {str(e)}")
    
