import os
import json
import uuid
import boto3
import re
import logging
from datetime import datetime, timezone
from typing import Any, List, cast

from models import LambdaResponse, Job

logger = logging.getLogger()
logger.setLevel(logging.INFO)

STATE_MACHINE_ARN = os.environ['STATE_MACHINE_ARN']
JOBS_TABLE = os.environ['JOBS_TABLE']
MAX_PROMPT_LENGTH = 1000
S3_PATH_PATTERN = re.compile(r'^s3://[a-z0-9.-]+/.*')

sfn = boto3.client('stepfunctions')
jobs_table = boto3.resource('dynamodb').Table(JOBS_TABLE)

def validate_inputs(prompt, s3_path=None, job_id=None):
    errors = []
    if not prompt or not isinstance(prompt, str):
        errors.append('Prompt is required and must be a string.')
    elif len(prompt) > MAX_PROMPT_LENGTH:
        errors.append(f'Prompt must be less than {MAX_PROMPT_LENGTH} characters.')
    
    if not s3_path and not job_id:
        errors.append('Either s3_path or job_id must be provided.')
    
    if s3_path and not S3_PATH_PATTERN.match(s3_path):
        errors.append('Invalid s3_path format. Must start with s3:// and be a valid S3 URI.')
    if job_id:
        try:
            uuid.UUID(job_id)
        except ValueError:
            errors.append('Invalid job_id format. Must be a valid UUID.')
    return errors

def create_error_response(status_code, error_type, message):
    return LambdaResponse(status_code, {"error": error_type, "message": message}).to_dict()

def handle_job_regeneration(job_id, user_id, prompt, current_timestamp):
    try:
        get_response = jobs_table.get_item(Key={'job_id': job_id})
        if 'Item' not in get_response:
            raise ValueError("Job not found")
        
        job = get_response['Item']
        if job.get('user_id') != user_id:
            raise PermissionError("Unauthorized access")
        
        existing_prompts = job.get('prompts', [])
        if existing_prompts is None:
            existing_prompts = []
        elif not isinstance(existing_prompts, list):
            existing_prompts = [existing_prompts]
        existing_prompts = cast(List[Any], existing_prompts)
        updated_prompts = existing_prompts + [prompt]
        
        response = jobs_table.update_item(
            Key={'job_id': job_id},
            UpdateExpression='SET prompts = :prompts, #status = :status, updated_at = :updated_at',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':prompts': updated_prompts,
                ':status': 'SCHEDULED',
                ':updated_at': current_timestamp,
                ':operation_type': 'regenerate'
            },
            ReturnValues='ALL_NEW'
        )
        return response['Attributes']['s3_path'], response['Attributes']['prompts']
    except ValueError:
        raise ValueError("Job not found")
    except PermissionError:
        raise PermissionError("Unauthorized access")
    except Exception as e:
        logger.error(f"Error updating job in DynamoDB: {e}")
        raise RuntimeError("Database error")

def create_new_job(job_id, user_id, s3_path, prompt, current_timestamp):
    job = Job(
        job_id=job_id, user_id=user_id, s3_path=s3_path, prompts=[prompt],
        status='SCHEDULED', operation_type="new", final_url='', summary='',
        agent_session_id='', created_at=current_timestamp, updated_at=current_timestamp
    )
    try:
        jobs_table.put_item(Item=job.to_dict())
        logger.info(f"Created new job: {job_id}")
    except Exception as e:
        logger.error(f"Error writing job to DynamoDB: {e}")
        raise RuntimeError("Database error")

def start_step_function(job_id, user_id, s3_path, prompts, operation_type):
    execution_name = f"{job_id}-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    
    try:
        get_response = jobs_table.get_item(Key={'job_id': job_id})
        if 'Item' not in get_response:
            raise ValueError("Job not found")
        job_object = get_response['Item']
        logger.info(f"Retrieved complete job object for execution: {execution_name}")
    except Exception as e:
        logger.error(f"Error retrieving job object: {e}")
        raise RuntimeError("Error retrieving job data")
    
    try:
        sfn.start_execution(stateMachineArn=STATE_MACHINE_ARN, name=execution_name, input=json.dumps(job_object))
        logger.info(f"Started step function execution: {execution_name}")
    except Exception as e:
        logger.error(f"Error starting Step Functions execution: {e}")
        try:
            jobs_table.update_item(
                Key={'job_id': job_id},
                UpdateExpression='SET #status = :status, updated_at = :updated_at',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':status': 'FAILED', ':updated_at': datetime.now(timezone.utc).isoformat()}
            )
        except Exception as rollback_error:
            logger.error(f"Error during rollback: {rollback_error}")
        raise RuntimeError("Execution error")

def lambda_handler(event, _):
    """
    Handles job submission and regeneration requests.
    
    Args:
        event: prompt, job_id (optional), s3_path
    
    Returns:
        dict: HTTP response with job_id, operation_type, message
    """
    if event.get('httpMethod') == 'OPTIONS':
        return LambdaResponse(200, {}).to_dict()
    
    logger.info("Submit job lambda handler started")
    user_id = event['requestContext']['authorizer']['claims'].get('sub')
    logger.info(f"Processing request for user_id: {user_id}")

    try:
        body = json.loads(event.get('body', '{}'))
        prompt = body.get('prompt', '').strip()
        job_id = body.get('job_id')
        s3_path = body.get('s3_path')

        validation_errors = validate_inputs(prompt, s3_path, job_id)
        if validation_errors:
            return create_error_response(400, "ValidationError", "Validation errors: " + "; ".join(validation_errors))

        current_timestamp = datetime.now(timezone.utc).isoformat()

        if job_id:
            operation_type = "regenerate"
            try:
                s3_path, prompts = handle_job_regeneration(job_id, user_id, prompt, current_timestamp)
            except ValueError:
                return create_error_response(404, "NotFoundError", "Job ID not found for regeneration. Please submit a new job.")
            except PermissionError:
                return create_error_response(403, "UnauthorizedError", "Unauthorized access to job.")
            except RuntimeError:
                return create_error_response(500, "DatabaseError", "Error accessing job data.")
        else:
            operation_type = "new"
            job_id = str(uuid.uuid4())
            prompts = [prompt]
            try:
                create_new_job(job_id, user_id, s3_path, prompt, current_timestamp)
            except RuntimeError:
                return create_error_response(500, "DatabaseError", "Error recording job data.")

        try:
            start_step_function(job_id, user_id, s3_path, prompts, operation_type)
        except RuntimeError:
            return create_error_response(500, "ExecutionError", "Error initiating job processing.")

        return LambdaResponse(202, {'message': 'Job accepted for processing.', 'job_id': job_id, 'operation_type': operation_type}).to_dict()

    except json.JSONDecodeError:
        return create_error_response(400, "ValidationError", "Invalid JSON in request body.")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return create_error_response(500, "InternalServerError", "Internal server error")