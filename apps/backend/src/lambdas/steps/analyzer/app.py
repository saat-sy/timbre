from datetime import datetime, timezone
import json
import uuid
import boto3
import re
import os
import logging
from typing import Optional, Dict, Any

from constants import Constants, EventFields, JobStatus, OperationType
from utils import validate_event, update_field_in_dynamodb

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb_resource = boto3.resource('dynamodb')
JOBS_TABLE = os.environ['JOBS_TABLE']
jobs_table = dynamodb_resource.Table(JOBS_TABLE)

def _extract_json_from_string(text: str) -> Optional[Dict[Any, Any]]:
    """
    Extract JSON from a string that may contain JSON annotations or code blocks.
    """
    if not text:
        return None
    
    code_block_pattern = r'```(?:json)?\s*(.*?)\s*```'
    match = re.search(code_block_pattern, text, re.DOTALL | re.IGNORECASE)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass
    
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass
    
    return None

def _extract_plan(data: str) -> Dict[Any, Any]:
    """
    Extract and validate JSON from response data.
    """
    if not isinstance(data, str):
        if isinstance(data, dict):
            return data
        data = str(data)
    
    try:
        logger.info("Extracting JSON from response")
        
        extracted_json = _extract_json_from_string(data)
        
        if extracted_json is not None:
            if isinstance(extracted_json, dict):
                logger.info("Successfully extracted valid JSON")
                return extracted_json
            else:
                logger.warning(f"Extracted JSON is not a dictionary: {type(extracted_json)}")
        
        logger.error("Failed to extract valid JSON")
        raise ValueError(f"Could not extract valid JSON from response. Response: {data[:500]}...")
        
    except Exception as e:
        logger.error(f"Error during JSON extraction: {str(e)}")
        raise ValueError(f"Could not extract valid JSON from response: {str(e)}")

def lambda_handler(event, context):
    """
    Invoke Bedrock AgentCore to analyze input and extract plan.
    
    Args:
        event: Step function event with job details and status
        context: Lambda context
    
    Returns:
        dict: Updated event for next step
    """

    try:
        logger.info("Analyzer Lambda started")

        validate_event(
            event,
            required_fields=[EventFields.JOB_ID, EventFields.STATUS, EventFields.PROMPT, EventFields.S3_URL, EventFields.OPERATION_TYPE]
        )

        job_id = event.get(EventFields.JOB_ID)
        operation_type = event.get(EventFields.OPERATION_TYPE)
        prompts = event.get(EventFields.PROMPTS)
        s3_url = event.get(EventFields.S3_URL)
        
        if operation_type == OperationType.NEW:
            session = str(uuid.uuid4())
        else:
            session = event.get("agent_session_id", "")

        agent_core_app = boto3.client('bedrock-agentcore', region_name='us-west-2')

        payload = json.dumps(
            {
                "prompt": prompts[-1],
                "s3_url": s3_url,
            }
        ).encode()

        response = agent_core_app.invoke_agent_runtime(
            agentRuntimeArn=os.environ.get('AGENT_RUNTIME_ARN'),
            runtimeSessionId=session,
            payload=payload,
        )

        response_body = response['response'].read()
        
        if isinstance(response_body, bytes):
            response_text = response_body.decode('utf-8')
        else:
            response_text = str(response_body)
        
        logger.info(f"Received response from agent: {response_text[:20]}...")
        
        response_body = response['response'].read()
        response_data = json.loads(response_body)

        update_field_in_dynamodb(
            jobs_table,
            job_id,
            {
                EventFields.STATUS: JobStatus.ANALYZED,
                EventFields.AGENT_SESSION_ID: session,
                EventFields.UPDATED_AT: datetime.now(timezone.utc).isoformat()
            }
        )
        event[EventFields.AGENT_SESSION_ID] = session
        event[EventFields.STATUS] = JobStatus.ANALYZED
        
        return _extract_plan(response_data["result"])

    except Exception as e:
        try:
            update_field_in_dynamodb(
                jobs_table,
                event.get(EventFields.JOB_ID, 'unknown'),
                {
                    EventFields.STATUS: JobStatus.FAILED,
                    EventFields.UPDATED_AT: datetime.now(timezone.utc).isoformat()
                }
            )
            event[EventFields.STATUS] = JobStatus.FAILED
        except Exception as db_error:
            logger.error(f"Failed to update job status in DynamoDB: {str(db_error)}")
        
        raise RuntimeError(f"Failed to invoke agent runtime: {str(e)}")
