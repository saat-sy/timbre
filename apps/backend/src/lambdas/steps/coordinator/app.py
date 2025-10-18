import json

def lambda_handler(event, context):
    print("--- 1. Coordinator Lambda ---")
    print(f"Received job: {json.dumps(event)}")
    # Pass the input to the next step
    return event