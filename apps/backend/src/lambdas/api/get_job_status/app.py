import os
import json
import boto3
from botocore.exceptions import ClientError

from models import LambdaResponse, Job

JOBS_TABLE = os.environ['JOBS_TABLE']

dynamodb = boto3.resource('dynamodb')
jobs_table = dynamodb.Table(JOBS_TABLE)

def lambda_handler(event, _):
    claims = event['requestContext']['authorizer']['claims']
    user_id = claims.get('sub')

    try:
        query_params = event.get('queryStringParameters') or {}
        job_id = query_params.get('job_id')
        
        if not job_id:
            return LambdaResponse(
                status_code=400,
                body={
                    "error": "Bad Request",
                    "message": "Missing job_id query parameter"
                }
            ).to_dict()

        response = jobs_table.get_item(
            Key={'job_id': job_id}
        )
        
        if 'Item' not in response:
            return LambdaResponse(
                status_code=404,
                body={
                    "error": "Not Found",
                    "message": "Job not found"
                }
            ).to_dict()
        
        job = response['Item']
        
        if job.get('user_id') != user_id:
            return LambdaResponse(
                status_code=403,
                body={
                    "error": "Forbidden",
                    "message": "Access denied: Job does not belong to user"
                }
            ).to_dict()
        
        job_instance = Job(
            job_id=job['job_id'],
            user_id=job.get('user_id', ''),
            s3_path=job.get('s3_path', ''),
            prompts=job.get('prompts', []),
            status=job.get('status', 'unknown'),
            operation_type=job.get('operation_type', ''),
            final_url=job.get('final_url', ''),
            summary=job.get('summary', ''),
            created_at=job.get('created_at', ''),
            updated_at=job.get('updated_at', '')
        )
        
        return LambdaResponse(
            status_code=200,
            body=job_instance.to_dict()
        ).to_dict()
        
    except ClientError as e:
        print(f"DynamoDB error: {e}")
        return LambdaResponse(
            status_code=500,
            body={
                "error": "Internal Server Error",
                "message": "Database error"
            }
        ).to_dict()
    except Exception as e:
        print(f"Error: {e}")
        return LambdaResponse(
            status_code=500,
            body={
                "error": "Internal Server Error",
                "message": "Internal server error"
            }
        ).to_dict()
