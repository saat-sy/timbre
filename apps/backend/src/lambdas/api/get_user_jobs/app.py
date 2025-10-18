import os
import json
import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Attr

from models import LambdaResponse, FailureResponse, Job

JOBS_TABLE = os.environ['JOBS_TABLE']

dynamodb = boto3.resource('dynamodb')
jobs_table = dynamodb.Table(JOBS_TABLE)

def lambda_handler(event, _):
    claims = event['requestContext']['authorizer']['claims']
    user_id = claims.get('sub')

    try:
        query_params = event.get('queryStringParameters') or {}
        limit = int(query_params.get('limit', 50))
        status_filter = query_params.get('status')
        
        if limit < 1 or limit > 100:
            failure_response = FailureResponse(
                error="ValidationError",
                error_code=400,
                message="Limit must be between 1 and 100"
            )
            return failure_response.to_dict()

        scan_kwargs = {
            'FilterExpression': Attr('user_id').eq(user_id),
            'Limit': limit
        }
        
        if status_filter:
            scan_kwargs['FilterExpression'] = scan_kwargs['FilterExpression'] & Attr('status').eq(status_filter)

        response = jobs_table.scan(**scan_kwargs)
        
        jobs_data = response.get('Items', [])
        
        jobs_data.sort(key=lambda x: str(x.get('created_at', '')), reverse=True)
        
        # Convert DynamoDB items to Job objects
        jobs = []
        for job_data in jobs_data:
            try:
                job = Job(
                    job_id=job_data.get('job_id', ''),
                    user_id=job_data.get('user_id', ''),
                    s3_path=job_data.get('s3_path', ''),
                    prompts=job_data.get('prompts', []),
                    status=job_data.get('status', 'unknown'),
                    operation_type=job_data.get('operation_type', ''),
                    final_url=job_data.get('final_url', ''),
                    summary=job_data.get('summary', ''),
                    created_at=job_data.get('created_at', ''),
                    updated_at=job_data.get('updated_at', '')
                )
                jobs.append(job.to_dict())
            except Exception as job_error:
                print(f"Error converting job data to Job object: {job_error}")
                # Skip malformed job data
                continue
        
        response_body = {
            'jobs': jobs,
            'count': len(jobs),
            'has_more': 'LastEvaluatedKey' in response
        }
        
        return LambdaResponse(200, response_body).to_dict()
        
    except ValueError as e:
        print(f"Validation error: {e}")
        failure_response = FailureResponse(
            error="ValidationError",
            error_code=400,
            message="Invalid query parameters"
        )
        return failure_response.to_dict()
    except ClientError as e:
        print(f"DynamoDB error: {e}")
        failure_response = FailureResponse(
            error="DatabaseError",
            error_code=500,
            message="Database error"
        )
        return failure_response.to_dict()
    except Exception as e:
        print(f"Error: {e}")
        failure_response = FailureResponse(
            error="InternalServerError",
            error_code=500,
            message="Internal server error"
        )
        return failure_response.to_dict()
