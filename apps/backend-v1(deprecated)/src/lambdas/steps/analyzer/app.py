from datetime import datetime, timezone
import json
import uuid
import boto3
import re
import os
import logging
from decimal import Decimal
from typing import Optional, Dict, Any

from constants import Constants, EventFields, JobStatus, OperationType
from utils import validate_event, update_field_in_dynamodb

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb_resource = boto3.resource('dynamodb')
JOBS_TABLE = os.environ['JOBS_TABLE']
jobs_table = dynamodb_resource.Table(JOBS_TABLE)

def _convert_floats_to_decimal(obj):
    """
    Recursively convert float values to Decimal for DynamoDB compatibility.
    """
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {key: _convert_floats_to_decimal(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [_convert_floats_to_decimal(item) for item in obj]
    else:
        return obj

def _extract_json_from_string(text: str):
    """
    Extract JSON from a string that may contain JSON annotations, code blocks, or mixed content.
    """
    if not text:
        return None
    
    try:
        match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
        if not match:
            print("No JSON block found.")
            return None

        raw_json = match.group(1)

        try:
            return json.loads(raw_json)
        except json.JSONDecodeError:
            pass

        cleaned = raw_json.encode().decode('unicode_escape')

        return json.loads(cleaned)

    except Exception as e:
        print("Error extracting JSON:", e)
        return None

def _extract_plan(data: Any) -> list:
    """
    Extract and validate JSON from response data.
    """    
    try:
        logger.info(f"Extracting JSON from response: {data[:500]}...")
        
        extracted_json = _extract_json_from_string(data)
        
        if extracted_json is not None:
            if isinstance(extracted_json, list):
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
            required_fields=[EventFields.JOB_ID, EventFields.STATUS, EventFields.PROMPTS, EventFields.S3_URL, EventFields.OPERATION_TYPE]
        )

        job_id = event.get(EventFields.JOB_ID)
        operation_type = event.get(EventFields.OPERATION_TYPE)
        prompts = event.get(EventFields.PROMPTS)
        s3_url = event.get(EventFields.S3_URL)
        session = str(uuid.uuid4())
        
        if operation_type == OperationType.REGENERATE:
            if event.get(EventFields.AGENT_SESSION_ID):
                session = event.get(EventFields.AGENT_SESSION_ID)

        agent_core_app = boto3.client('bedrock-agentcore', region_name='us-west-2')

        payload = json.dumps(
            {
                "prompt": prompts[-1],
                "s3_url": s3_url,
                "type": operation_type
            }
        ).encode()

        response = agent_core_app.invoke_agent_runtime(
            agentRuntimeArn=os.environ.get('AGENT_RUNTIME_ARN'),
            runtimeSessionId=session,
            payload=payload,
        )

        response_body = response['response'].read()
        response_data = json.loads(response_body)
        
        logger.info(f"Received response from agent: {response_data}...")

        agent_result = response_data["result"]
        if isinstance(agent_result, dict) and "content" in agent_result:
            text_content = agent_result["content"][0]["text"] if agent_result["content"] else ""
            plan = _extract_plan(text_content)
        else:
            plan = _extract_plan(agent_result)

        plan = _convert_floats_to_decimal(plan)

        update_field_in_dynamodb(
            jobs_table,
            job_id,
            {
                EventFields.STATUS: JobStatus.ANALYZED,
                EventFields.AGENT_SESSION_ID: session,
                EventFields.PLAN: plan,
                EventFields.UPDATED_AT: datetime.now(timezone.utc).isoformat()
            }
        )
        event[EventFields.AGENT_SESSION_ID] = session
        event[EventFields.STATUS] = JobStatus.ANALYZED
        event[EventFields.PLAN] = plan
        
        return event
    except Exception as e:
        raise RuntimeError(f"Failed to invoke agent runtime: {str(e)}")
