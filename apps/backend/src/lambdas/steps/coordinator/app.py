import boto3
import os
import logging
from datetime import datetime, timezone

logger = logging.getLogger()
logger.setLevel(logging.INFO)

JOBS_TABLE = os.environ['JOBS_TABLE']
jobs_table = boto3.resource('dynamodb').Table(JOBS_TABLE)

def update_job_status(job_id, status, final_url=None, summary=None):
    try:
        update_expressions = ['#status = :status', 'updated_at = :updated_at']
        expression_attribute_names = {'#status': 'status'}
        expression_attribute_values = {
            ':status': status,
            ':updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        if final_url:
            update_expressions.append('#final_url = :final_url')
            expression_attribute_names['#final_url'] = 'final_url'
            expression_attribute_values[':final_url'] = final_url
        
        if summary:
            update_expressions.append('#summary = :summary')
            expression_attribute_names['#summary'] = 'summary'
            expression_attribute_values[':summary'] = summary
        
        response = jobs_table.update_item(
            Key={'job_id': job_id},
            UpdateExpression='SET ' + ', '.join(update_expressions),
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues='UPDATED_NEW'
        )
        logger.info(f"Updated job {job_id} status to {status}")
        return response.get('Attributes', {})
    except Exception as e:
        logger.error(f"Error updating job {job_id} status: {e}")
        raise


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
    logger.info(f"Processing job: {event.get('job_id')}")
    
    job_id = event.get('job_id')
    current_status = event.get('status')
    
    if current_status == 'PROCESSED':
        final_url = event.get('final_url', '')
        summary = event.get('summary', '')

        logger.info(f"Job {job_id} processing completed, updating to COMPLETED status")
        update_job_status(job_id, 'COMPLETED', final_url, summary)
        event['status'] = 'COMPLETED'
    else:
        logger.info(f"Job {job_id} starting, updating to PROCESSING status")
        update_job_status(job_id, 'PROCESSING')
        event['status'] = 'PROCESSING'
    
    return event