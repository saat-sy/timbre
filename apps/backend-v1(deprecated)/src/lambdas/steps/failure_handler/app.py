import boto3
import os
import logging
import json
from datetime import datetime, timezone

from utils import update_field_in_dynamodb
from constants import EventFields, JobStatus

logger = logging.getLogger()
logger.setLevel(logging.INFO)

JOBS_TABLE = os.environ['JOBS_TABLE']
dynamodb_resource = boto3.resource('dynamodb')
jobs_table = dynamodb_resource.Table(JOBS_TABLE)

def lambda_handler(event, context):
    """
    Handles job failures with cleanup, notifications, and status updates.
    
    Args:
        event: Step function event with job details and error information
        context: Lambda context
    
    Returns:
        dict: Updated event with failure status
    """
    logger.info("Failure Handler Lambda started")
    logger.info(f"Received event: {json.dumps(event)}")
    
    job_id = 'unknown'
    
    try:
        job_id = event.get(EventFields.JOB_ID, 'unknown')
        
        error_details = event.get('error', {})
        error_type = error_details.get('Error', 'Unknown')
        error_cause = error_details.get('Cause', 'Unknown error occurred')
        
        logger.error(f"Job {job_id} failed. Error: {error_type}, Cause: {error_cause}")
        
        update_data = {
            EventFields.STATUS: JobStatus.FAILED,
            EventFields.UPDATED_AT: datetime.now(timezone.utc).isoformat(),
            EventFields.ERROR: {
                'error_type': error_type,
                'error_cause': error_cause,
                'failed_at': datetime.now(timezone.utc).isoformat()
            }
        }
        
        update_field_in_dynamodb(jobs_table, job_id, update_data)
        event[EventFields.STATUS] = JobStatus.FAILED
        event['failure_handled'] = True
        
        logger.info(f"Failure handling completed for job {job_id}")
        return event
        
    except Exception as e:
        logger.error(f"Critical error in failure handler: {e}")
        return event