import boto3
import os
import logging
import json
from datetime import datetime, timezone

from utils import validate_event, update_field_in_dynamodb
from constants import EventFields, JobStatus, Constants

logger = logging.getLogger()
logger.setLevel(logging.INFO)

JOBS_TABLE = os.environ['JOBS_TABLE']
dynamodb_resource = boto3.resource('dynamodb')
jobs_table = dynamodb_resource.Table(JOBS_TABLE)

def _summarize_generated_content(prompt, plan):
    """
    Summarize the generated content using a simple heuristic.
    
    Args:
        content (str): The content to summarize.
    
    Returns:
        str: A summary of the content.
    """
    bedrock_resource = boto3.client('bedrock', region_name='us-east-2')
    summary_prompt = Constants.get_summary_prompt(prompt, plan)

    response = bedrock_resource.invoke_model(
        modelId=Constants.SUMMARY_MODEL,
        body=json.dumps({
            "prompt": summary_prompt,
        }),
        contentType='application/json',
        accept='application/json',
    )

    return json.loads(response['body'].read())

def lambda_handler(event, _):
    """
    Coordinates job processing workflow and updates job status.
    
    Args:
        event: Step function event with job details and status
        context: Lambda context
    
    Returns:
        dict: Updated event for next step
    """
    logger.info("Coordinator Lambda started")
    
    try: 
        logger.info("Validating event for required fields")
        validate_event(
            event,
            required_fields=[EventFields.JOB_ID, EventFields.STATUS]
        )

        logger.info(f"Processing job: {event.get(EventFields.JOB_ID)}")

        job_id = event.get(EventFields.JOB_ID)
        status = event.get(EventFields.STATUS)

        if status == JobStatus.PROCESSED:
            logger.info(f"Job {job_id} processing completed, updating to COMPLETED status")
            validate_event(
                event,
                required_fields=[EventFields.FINAL_URL, EventFields.PLAN]
            )
            final_url = event.get(EventFields.FINAL_URL)
            plan = event.get(EventFields.PLAN)

            summary = _summarize_generated_content(event.get(EventFields.PROMPTS)[-1], plan)

            update_field_in_dynamodb(
                jobs_table,
                job_id,
                {
                    EventFields.STATUS: JobStatus.COMPLETED,
                    EventFields.FINAL_URL: final_url,
                    EventFields.SUMMARY: summary,
                    EventFields.PLAN: plan,
                    EventFields.UPDATED_AT: datetime.now(timezone.utc).isoformat()
                }
            )
        elif status == JobStatus.SCHEDULED:
            logger.info(f"Job {job_id} starting, updating to PROCESSING status")
            update_field_in_dynamodb(
                jobs_table,
                job_id,
                {EventFields.STATUS: JobStatus.PROCESSING, EventFields.UPDATED_AT: datetime.now(timezone.utc).isoformat()}
            )
            event[EventFields.STATUS] = JobStatus.PROCESSING
        elif status == JobStatus.FAILED:
            logger.info(f"Job {job_id} failed, updating to FAILED status")
            update_field_in_dynamodb(
                jobs_table,
                job_id,
                {EventFields.STATUS: JobStatus.FAILED, EventFields.UPDATED_AT: datetime.now(timezone.utc).isoformat()}
            )
            event[EventFields.STATUS] = JobStatus.FAILED
        
        return event
    except Exception as e:
        logger.error(f"Error in coordinator lambda: {e}")
        update_field_in_dynamodb(
            jobs_table,
            event.get(EventFields.JOB_ID, 'unknown'),
            {EventFields.STATUS: JobStatus.FAILED, EventFields.UPDATED_AT: datetime.now(timezone.utc).isoformat()}
        )
        event[EventFields.STATUS] = JobStatus.FAILED
        raise Exception(f"Coordinator Lambda failed: {str(e)}")
