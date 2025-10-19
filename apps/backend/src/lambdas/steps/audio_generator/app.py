import json
import time

def lambda_handler(event, context):
    print("--- 4. Generate Audio Lambda ---")
    time.sleep(2)
    print(f"Generating audio for prompt: {event.get('prompt')}")
    event['generated_audio_s3_path'] = f"s3://timbre-bucket/audio/{event.get('job_id')}.mp3"
    return event