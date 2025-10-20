import boto3
import subprocess
import tempfile
import os
from urllib.parse import urlparse

s3_client = boto3.client('s3')

def lambda_handler(event, context):
    try:
        plan = event["plan"]
        video_s3_path = event["video_s3_path"]
        
        bucket_name, video_key = parse_s3_url(video_s3_path)
        
        with tempfile.TemporaryDirectory() as temp_dir:
            video_file = os.path.join(temp_dir, "input_video.mp4")
            output_file = os.path.join(temp_dir, "output_video.mp4")
            
            download_from_s3(bucket_name, video_key, video_file)
            
            audio_files = []
            for segment in plan:
                audio_file = os.path.join(temp_dir, f"audio_{segment['start']}.wav")
                audio_bucket, audio_key = parse_s3_url(segment["audio_path"])
                download_from_s3(audio_bucket, audio_key, audio_file)
                audio_files.append({
                    "file": audio_file,
                    "start": segment["start"],
                    "end": segment["end"]
                })
            
            combine_video_audio(video_file, audio_files, output_file)
            
            output_key = f"final/{os.path.basename(video_key)}"
            upload_to_s3(bucket_name, output_key, output_file)
            output_s3_url = f"s3://{bucket_name}/{output_key}"

            event["final_url"] = output_s3_url
            event["status"] = "PROCESSED"
        return event
        
    except Exception as e:
        raise e

def parse_s3_url(s3_url):
    parsed = urlparse(s3_url)
    bucket = parsed.netloc
    key = parsed.path.lstrip('/')
    return bucket, key

def download_from_s3(bucket, key, local_path):
    s3_client.download_file(bucket, key, local_path)

def upload_to_s3(bucket, key, local_path):
    s3_client.upload_file(local_path, bucket, key)

def combine_video_audio(video_file, audio_files, output_file):
    filter_complex = []
    input_args = ["-i", video_file]
    
    for i, audio in enumerate(audio_files):
        input_args.extend(["-i", audio["file"]])
        duration = audio["end"] - audio["start"]
        delay = int(audio["start"] * 1000)
        
        filter_complex.append(f"[{i+1}:a]adelay={delay}|{delay}[delayed{i}]")
    
    if audio_files:
        mix_inputs = "".join([f"[delayed{i}]" for i in range(len(audio_files))])
        filter_complex.append(f"{mix_inputs}amix=inputs={len(audio_files)}:duration=longest[mixed]")
        
        cmd = [
            "ffmpeg", "-y"
        ] + input_args + [
            "-filter_complex", ";".join(filter_complex),
            "-map", "0:v",
            "-map", "[mixed]",
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
    
    subprocess.run(cmd, check=True, capture_output=True)
    