import os
import json
import boto3
import logging
from botocore.exceptions import ClientError

from models import LambdaResponse, Job

logger = logging.getLogger()
logger.setLevel(logging.INFO)

JOBS_TABLE = os.environ['JOBS_TABLE']
jobs_table = boto3.resource('dynamodb').Table(JOBS_TABLE)

def create_error_response(status_code, error_type, message):
    return LambdaResponse(status_code, {"error": error_type, "message": message}).to_dict()

def lambda_handler(event, _):
    """
    Retrieves job status for a specific job ID.
    
    Args:
        event: Query parameter job_id
    
    Returns:
        dict: HTTP response with job details or error
    """
    # Handle CORS preflight requests
    if event.get('httpMethod') == 'OPTIONS':
        return LambdaResponse(200, {}).to_dict()
    
    user_id = event['requestContext']['authorizer']['claims'].get('sub')
    logger.info(f"Getting job status for user: {user_id}")

    try:
        job_id = (event.get('queryStringParameters') or {}).get('job_id')
        if not job_id:
            return create_error_response(400, "Bad Request", "Missing job_id query parameter")

        response = jobs_table.get_item(Key={'job_id': job_id})
        if 'Item' not in response:
            return create_error_response(404, "Not Found", "Job not found")
        
        job = response['Item']
        if job.get('user_id') != user_id:
            return create_error_response(403, "Forbidden", "Access denied: Job does not belong to user")
        
        job_instance = Job(
            job_id=job['job_id'], user_id=job.get('user_id', ''), s3_path=job.get('s3_path', ''),
            prompts=job.get('prompts', []), status=job.get('status', 'unknown'), operation_type=job.get('operation_type', ''),
            final_url=job.get('final_url', ''), summary=job.get('summary', ''),
            agent_session_id=job.get('agent_session_id', ''),
            created_at=job.get('created_at', ''), updated_at=job.get('updated_at', '')
        )
        
        return LambdaResponse(200, job_instance.to_dict()).to_dict()
        
    except ClientError as e:
        logger.error(f"DynamoDB error: {e}")
        return create_error_response(500, "Internal Server Error", "Database error")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return create_error_response(500, "Internal Server Error", "Internal server error")
