import os
import json
import uuid

def lambda_handler(event, _):
    claims = event['requestContext']['authorizer']['claims']
    
    try:
        body = json.loads(event.get('body', '{}'))
        s3_path = body.get('s3_path')
        prompt = body.get('prompt')

        if not s3_path or not prompt:
            return {'statusCode': 400, 'body': json.dumps({'message': 'Missing s3_path or prompt.'})}

        job_id = str(uuid.uuid4())
        
        print(f"Mock job scheduled by user {claims.get('sub')} with ID {job_id}")
        print(f"S3 Path: {s3_path}")
        print(f"Prompt: {prompt}")

        return {
            'statusCode': 202,
            'body': json.dumps({
                'message': 'Job accepted for processing (MOCK)', 
                'job_id': job_id
            })
        }

    except Exception as e:
        print(f"Error: {e}")
        return {'statusCode': 500, 'body': json.dumps({'message': 'Internal server error'})}