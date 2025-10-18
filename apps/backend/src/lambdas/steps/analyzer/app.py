import json

def lambda_handler(event, context):
    print("--- 2. Analyzer Lambda ---")
    print(f"Analyzing video: {event.get('s3_path')}")
    # Add mock analysis data to the event
    event['analysis_result'] = "bright, fast-paced, outdoor"
    return event