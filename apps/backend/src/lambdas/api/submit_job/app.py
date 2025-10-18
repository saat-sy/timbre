import os
import json
import uuid
import boto3
import re
from datetime import datetime, timezone
from botocore.exceptions import ClientError

from models import LambdaResponse, FailureResponse, Job

STATE_MACHINE_ARN = os.environ['STATE_MACHINE_ARN']
JOBS_TABLE = os.environ['JOBS_TABLE']

sfn = boto3.client('stepfunctions')
dynamodb = boto3.resource('dynamodb')
jobs_table = dynamodb.Table(JOBS_TABLE)

MAX_PROMPT_LENGTH = 1000
S3_PATH_PATTERN = re.compile(r'^s3://[a-z0-9.-]+/.*$')

def validate_inputs(prompt, s3_path=None, job_id=None):
    errors = []
    
    if not prompt or not isinstance(prompt, str):
        errors.append('Prompt is required and must be a string.')
    elif len(prompt) > MAX_PROMPT_LENGTH:
        errors.append(f'Prompt must be less than {MAX_PROMPT_LENGTH} characters.')
    
    if s3_path and not S3_PATH_PATTERN.match(s3_path):
        errors.append('Invalid s3_path format. Must start with s3:// and be a valid S3 URI.')
    
    if job_id:
        try:
            uuid.UUID(job_id)
        except ValueError:
            errors.append('Invalid job_id format. Must be a valid UUID.')
    
    return errors

def lambda_handler(event, _):
    claims = event['requestContext']['authorizer']['claims']
    user_id = claims.get('sub')

    try:
        body = json.loads(event.get('body', '{}'))
        prompt = body.get('prompt', '').strip()
        job_id = body.get('job_id')
        s3_path = body.get('s3_path')

        validation_errors = validate_inputs(prompt, s3_path, job_id)
        if validation_errors:
            failure_response = FailureResponse(
                error="ValidationError",
                error_code=400,
                message="Validation errors: " + "; ".join(validation_errors)
            )
            return failure_response.to_dict()

        current_timestamp = datetime.now(timezone.utc).isoformat()

        if job_id:
            # Regeneration operation
            operation_type = "regenerate"
            
            try:
                # Use atomic update operation with condition expression
                response = jobs_table.update_item(
                    Key={'job_id': job_id},
                    UpdateExpression='SET prompts = list_append(prompts, :new_prompt), #status = :status, updated_at = :updated_at',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={
                        ':new_prompt': [prompt],
                        ':status': 'SCHEDULED',
                        ':updated_at': current_timestamp,
                        ':user_id': user_id
                    },
                    ConditionExpression='user_id = :user_id',
                    ReturnValues='ALL_NEW'
                )
                
                updated_job = response['Attributes']
                s3_path = updated_job['s3_path']
                prompts = updated_job['prompts']
                
            except ClientError as e:
                if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
                    try:
                        response = jobs_table.get_item(Key={'job_id': job_id})
                        if 'Item' not in response:
                            failure_response = FailureResponse(
                                error="NotFoundError",
                                error_code=404,
                                message="Job ID not found for regeneration. Please submit a new job."
                            )
                            return failure_response.to_dict()
                        else:
                            failure_response = FailureResponse(
                                error="UnauthorizedError",
                                error_code=403,
                                message="Unauthorized access to job."
                            )
                            return failure_response.to_dict()
                    except Exception:
                        failure_response = FailureResponse(
                            error="NotFoundError",
                            error_code=404,
                            message="Job ID not found for regeneration. Please submit a new job."
                        )
                        return failure_response.to_dict()
                else:
                    print(f"Error updating job in DynamoDB: {e}")
                    failure_response = FailureResponse(
                        error="DatabaseError",
                        error_code=500,
                        message="Error accessing job data."
                    )
                    return failure_response.to_dict()
            except Exception as e:
                print(f"Error updating job in DynamoDB: {e}")
                failure_response = FailureResponse(
                    error="DatabaseError",
                    error_code=500,
                    message="Error accessing job data."
                )
                return failure_response.to_dict()

        else:
            # New job operation
            operation_type = "new"
            job_id = str(uuid.uuid4())

            if not s3_path:
                failure_response = FailureResponse(
                    error="ValidationError",
                    error_code=400,
                    message="Missing s3_path for new job submission."
                )
                return failure_response.to_dict()
        
            prompts = [prompt]

            # Create Job object for new job
            job = Job(
                job_id=job_id,
                user_id=user_id,
                s3_path=s3_path,
                prompts=prompts,
                status='SCHEDULED',
                operation_type=operation_type,
                final_url='',
                summary='',
                created_at=current_timestamp,
                updated_at=current_timestamp
            )

            # Record new job in DynamoDB
            try:
                jobs_table.put_item(Item=job.to_dict())
            except Exception as e:
                print(f"Error writing job to DynamoDB: {e}")
                failure_response = FailureResponse(
                    error="DatabaseError",
                    error_code=500,
                    message="Error recording job data."
                )
                return failure_response.to_dict()
        
        # Start Step Functions execution with unique name
        execution_name = f"{job_id}-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        job_input = {
            'job_id': job_id,
            'user_id': user_id,
            's3_path': s3_path,
            'prompts': prompts,
            'operation_type': operation_type
        }

        try:
            sfn.start_execution(
                stateMachineArn=STATE_MACHINE_ARN,
                name=execution_name,
                input=json.dumps(job_input)
            )
        except Exception as e:
            print(f"Error starting Step Functions execution: {e}")
            # Rollback: Update job status to FAILED
            try:
                jobs_table.update_item(
                    Key={'job_id': job_id},
                    UpdateExpression='SET #status = :status, updated_at = :updated_at',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={
                        ':status': 'FAILED',
                        ':updated_at': datetime.now(timezone.utc).isoformat()
                    }
                )
            except Exception as rollback_error:
                print(f"Error during rollback: {rollback_error}")
            
            failure_response = FailureResponse(
                error="ExecutionError",
                error_code=500,
                message="Error initiating job processing."
            )
            return failure_response.to_dict()

        response_body = {
            'message': 'Job accepted for processing.', 
            'job_id': job_id,
            'operation_type': operation_type
        }
        return LambdaResponse(202, response_body).to_dict()

    except json.JSONDecodeError:
        failure_response = FailureResponse(
            error="ValidationError",
            error_code=400,
            message="Invalid JSON in request body."
        )
        return failure_response.to_dict()
    except Exception as e:
        print(f"Unexpected error: {e}")
        failure_response = FailureResponse(
            error="InternalServerError",
            error_code=500,
            message="Internal server error"
        )
        return failure_response.to_dict()