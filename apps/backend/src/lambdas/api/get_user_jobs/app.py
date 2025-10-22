import os
import json
import boto3
import logging
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Attr

from models import LambdaResponse, Job

logger = logging.getLogger()
logger.setLevel(logging.INFO)

JOBS_TABLE = os.environ['JOBS_TABLE']
jobs_table = boto3.resource('dynamodb').Table(JOBS_TABLE)

def create_error_response(status_code, error_type, message):
    return LambdaResponse(status_code, {"error": error_type, "message": message}).to_dict()

def convert_to_job_objects(jobs_data):
    jobs = []
    for job_data in jobs_data:
        try:
            job = Job(
                job_id=job_data.get('job_id', ''), user_id=job_data.get('user_id', ''), s3_path=job_data.get('s3_path', ''),
                prompts=job_data.get('prompts', []), status=job_data.get('status', 'unknown'), operation_type=job_data.get('operation_type', ''),
                final_url=job_data.get('final_url', ''), summary=job_data.get('summary', ''),
                agent_session_id=job_data.get('agent_session_id', ''),
                created_at=job_data.get('created_at', ''), updated_at=job_data.get('updated_at', '')
            )
            jobs.append(job.to_dict())
        except Exception as job_error:
            logger.error(f"Error converting job data to Job object: {job_error}")
            continue
    return jobs

def lambda_handler(event, _):
    """
    Retrieves user's jobs with optional filtering and pagination.
    
    Args:
        event: Query parameters limit, status (optional)
    
    Returns:
        dict: HTTP response with jobs list, count, and pagination info
    """
    if event.get('httpMethod') == 'OPTIONS':
        return LambdaResponse(200, {}).to_dict()
    
    user_id = event['requestContext']['authorizer']['claims'].get('sub')
    logger.info(f"Getting jobs for user: {user_id}")

    try:
        query_params = event.get('queryStringParameters') or {}
        limit = int(query_params.get('limit', 50))
        status_filter = query_params.get('status')
        
        if limit < 1 or limit > 100:
            return create_error_response(400, "ValidationError", "Limit must be between 1 and 100")

        scan_kwargs = {'FilterExpression': Attr('user_id').eq(user_id), 'Limit': limit}
        if status_filter:
            scan_kwargs['FilterExpression'] = scan_kwargs['FilterExpression'] & Attr('status').eq(status_filter)

        response = jobs_table.scan(**scan_kwargs)
        jobs_data = response.get('Items', [])
        jobs_data.sort(key=lambda x: str(x.get('created_at', '')), reverse=True)
        
        jobs = convert_to_job_objects(jobs_data)
        response_body = {'jobs': jobs, 'count': len(jobs), 'has_more': 'LastEvaluatedKey' in response}
        
        return LambdaResponse(200, response_body).to_dict()
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return create_error_response(400, "ValidationError", "Invalid query parameters")
    except ClientError as e:
        logger.error(f"DynamoDB error: {e}")
        return create_error_response(500, "DatabaseError", "Database error")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return create_error_response(500, "InternalServerError", "Internal server error")
