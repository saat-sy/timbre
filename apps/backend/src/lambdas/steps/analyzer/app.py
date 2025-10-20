import json
import uuid
import boto3
import re
import logging
from typing import Optional, Dict, Any

from constants import Constants

logger = logging.getLogger()
logger.setLevel(logging.INFO)

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
    operation_type = event.get('operation_type', '')
    if operation_type == '':
        raise ValueError("Event type is missing")
    
    if operation_type == "new":
        session = str(uuid.uuid4())
    else:
        session = event.get("agent_session_id", "")

    agent_core_app = boto3.client('bedrock-agentcore', region_name='us-west-2')

    payload = json.dumps(
        {
            "prompt": event.get("prompt", ""),
            "s3_url": event.get("s3_url", ""),
        }
    ).encode()

    try:
        response = agent_core_app.invoke_agent_runtime(
            agentRuntimeArn=Constants.AGENT_RUNTIME_ARN,
            runtimeSessionId=session,
            payload=payload,
        )

        response_body = response['response'].read()
        
        if isinstance(response_body, bytes):
            response_text = response_body.decode('utf-8')
        else:
            response_text = str(response_body)
        
        logger.info(f"Received response from agent: {response_text[:200]}...")
        
        response_body = response['response'].read()
        response_data = json.loads(response_body)
        
        return _extract_plan(response_data["result"])

    except ValueError as ve:
        logger.error(f"JSON extraction failed: {str(ve)}")
        raise ve
    except Exception as e:
        logger.error(f"Failed to invoke agent runtime: {str(e)}")
        raise RuntimeError(f"Failed to invoke agent runtime: {str(e)}")