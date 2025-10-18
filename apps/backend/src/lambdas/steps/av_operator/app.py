import json

def lambda_handler(event, context):
    print("--- 6. Audio Video Operations Lambda ---")
    print(f"Merging video {event.get('s3_path')} with audio {event.get('generated_audio_s3_path')}")
    event['final_video_s3_path'] = f"s3://timbre-bucket/final/{event.get('job_id')}.mp4"
    return event