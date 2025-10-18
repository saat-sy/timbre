import os
import json
import uuid
import boto3
import re
from datetime import datetime, timezone
from botocore.exceptions import ClientError

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
            return {
                'statusCode': 400, 
                'body': json.dumps({'message': 'Validation errors', 'errors': validation_errors})
            }

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
                            return {'statusCode': 404, 'body': json.dumps({'message': 'Job ID not found for regeneration. Please submit a new job.'})}
                        else:
                            return {'statusCode': 403, 'body': json.dumps({'message': 'Unauthorized access to job.'})}
                    except Exception:
                        return {'statusCode': 404, 'body': json.dumps({'message': 'Job ID not found for regeneration. Please submit a new job.'})}
                else:
                    print(f"Error updating job in DynamoDB: {e}")
                    return {'statusCode': 500, 'body': json.dumps({'message': 'Error accessing job data.'})}
            except Exception as e:
                print(f"Error updating job in DynamoDB: {e}")
                return {'statusCode': 500, 'body': json.dumps({'message': 'Error accessing job data.'})}

        else:
            # New job operation
            operation_type = "new"
            job_id = str(uuid.uuid4())

            if not s3_path:
                return {'statusCode': 400, 'body': json.dumps({'message': 'Missing s3_path for new job submission.'})}
        
            prompts = [prompt]

            # Record new job in DynamoDB
            try:
                jobs_table.put_item(
                    Item={
                        'job_id': job_id,
                        'user_id': user_id,
                        's3_path': s3_path,
                        'prompts': prompts,
                        'status': 'SCHEDULED',
                        'operation_type': operation_type,
                        'created_at': current_timestamp,
                        'updated_at': current_timestamp
                    }
                )
            except Exception as e:
                print(f"Error writing job to DynamoDB: {e}")
                return {'statusCode': 500, 'body': json.dumps({'message': 'Error recording job data.'})}
        
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
            
            return {'statusCode': 500, 'body': json.dumps({'message': 'Error initiating job processing.'})}

        return {
            'statusCode': 202,
            'body': json.dumps({
                'message': 'Job accepted for processing.', 
                'job_id': job_id,
                'operation_type': operation_type
            })
        }

    except json.JSONDecodeError:
        return {'statusCode': 400, 'body': json.dumps({'message': 'Invalid JSON in request body.'})}
    except Exception as e:
        print(f"Unexpected error: {e}")
        return {'statusCode': 500, 'body': json.dumps({'message': 'Internal server error'})}