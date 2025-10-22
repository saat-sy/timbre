import json
import uuid
import boto3
import os
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

from constants import Constants, EventFields, JobStatus
from utils import validate_event, update_field_in_dynamodb

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sagemaker_runtime = boto3.client('sagemaker-runtime')
s3_client = boto3.client('s3')
dynamodb_resource = boto3.resource('dynamodb')

JOBS_TABLE = os.environ['JOBS_TABLE']
MUSIC_GEN_ENDPOINT_NAME = os.environ['MUSIC_GEN_ENDPOINT_NAME']
SAGEMAKER_SESSION_BUCKET = os.environ['SAGEMAKER_SESSION_BUCKET']

jobs_table = dynamodb_resource.Table(JOBS_TABLE)

def _generate_input_json(text: str, bucket_name: str, generation_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Generate input JSON for MusicGen model.
    
    Args:
        text: Single text prompt for music generation
        bucket_name: S3 bucket name for storing outputs
        generation_params: Optional generation parameters
    
    Returns:
        dict: Input data for MusicGen model
    """
    if generation_params is None:
        generation_params = {
            'guidance_scale': 3,
            'max_new_tokens': 1260,
            'do_sample': True,
            'temperature': 0.9
        }
    
    return {
        "texts": [text],
        "bucket_name": bucket_name,
        "generation_params": generation_params
    }

def _upload_input_json(data: Dict[str, Any], bucket_name: str, job_id: str) -> str:
    """
    Upload input JSON to S3 and return the S3 location.
    
    Args:
        data: Input data dictionary
        bucket_name: S3 bucket name
        job_id: Job ID for organizing the S3 key structure
    
    Returns:
        str: S3 URI of uploaded file
    """
    unique_id = str(uuid.uuid4())
    s3_key = f"plan/{job_id}/{unique_id}.json"
    
    s3_client.put_object(
        Bucket=bucket_name,
        Key=s3_key,
        Body=json.dumps(data),
        ContentType='application/json'
    )
    
    return f"s3://{bucket_name}/{s3_key}"

def _wait_for_multiple_async_inference_completion(jobs: List[Dict[str, Any]], max_wait_time: int = 3600) -> List[Dict[str, Any]]:
    """
    Wait for multiple async inference jobs to complete and return all outputs.
    
    Args:
        jobs: List of job dictionaries with 'output_location', 'prompt_index', etc.
        max_wait_time: Maximum time to wait in seconds
    
    Returns:
        List[Dict[str, Any]]: List of completed job results with output data
    """
    import time
    
    completed_jobs = []
    pending_jobs = jobs.copy()
    wait_time = 0
    poll_interval = 10
    
    logger.info(f"Waiting for {len(pending_jobs)} async inference jobs to complete...")
    
    while pending_jobs and wait_time < max_wait_time:
        newly_completed = []
        
        for job in pending_jobs:
            output_location = job['output_location']
            bucket_name = output_location.split('/')[2]
            key = '/'.join(output_location.split('/')[3:])
            
            try:
                response = s3_client.get_object(Bucket=bucket_name, Key=key)
                output_data = json.loads(response['Body'].read().decode('utf-8'))
                
                job['output_data'] = output_data
                completed_jobs.append(job)
                newly_completed.append(job)
                
                logger.info(f"Completed inference for prompt {job['prompt_index']+1}")
                
            except s3_client.exceptions.NoSuchKey:
                continue
            except Exception as e:
                logger.error(f"Error checking output for prompt {job['prompt_index']+1}: {str(e)}")
                continue
        
        for completed_job in newly_completed:
            pending_jobs.remove(completed_job)
        
        if pending_jobs:
            logger.info(f"{len(completed_jobs)} completed, {len(pending_jobs)} still pending. Waiting {poll_interval} seconds...")
            time.sleep(poll_interval)
            wait_time += poll_interval
        else:
            logger.info("All async inference jobs completed successfully!")
            break
    
    if pending_jobs:
        raise TimeoutError(f"{len(pending_jobs)} async inference jobs did not complete within {max_wait_time} seconds")
    
    return completed_jobs

def _generate_audio_for_prompts(audio_prompts: List[str], job_id: str) -> List[str]:
    """
    Generate audio files for multiple prompts by making concurrent SageMaker calls.
    
    Args:
        audio_prompts: List of text prompts for music generation
        job_id: Job ID for organizing S3 structure
    
    Returns:
        List[str]: List of S3 URLs for generated audio files
    """
    inference_jobs = []
    
    for i, prompt in enumerate(audio_prompts):
        logger.info(f"Preparing prompt {i+1}/{len(audio_prompts)}: {prompt[:50]}...")
        
        input_data = _generate_input_json(
            text=prompt,
            bucket_name=SAGEMAKER_SESSION_BUCKET
        )
        
        input_s3_location = _upload_input_json(input_data, SAGEMAKER_SESSION_BUCKET, job_id)
        logger.info(f"Uploaded input {i+1} to: {input_s3_location}")
        
        response = sagemaker_runtime.invoke_endpoint_async(
            EndpointName=MUSIC_GEN_ENDPOINT_NAME,
            InputLocation=input_s3_location,
            ContentType="application/json",
            InvocationTimeoutSeconds=3600
        )
        
        output_location = response.get('OutputLocation')
        logger.info(f"Async inference {i+1} started, output will be at: {output_location}")
        
        inference_jobs.append({
            'prompt_index': i,
            'prompt': prompt,
            'output_location': output_location
        })
    
    logger.info(f"All {len(inference_jobs)} SageMaker requests submitted. Now waiting for completion...")
    
    completed_jobs = _wait_for_multiple_async_inference_completion(inference_jobs)
    
    for job in completed_jobs:
        output_data = job['output_data']
        
        audio_s3_url = output_data.get('generated_output_s3')
        if not audio_s3_url:
            audio_outputs = output_data.get('generated_outputs_s3', [])
            audio_s3_url = audio_outputs[0] if audio_outputs else None
        
        if not audio_s3_url:
            raise ValueError(f"No audio file was generated for prompt {job['prompt_index']+1}")
        
        job['audio_s3_url'] = audio_s3_url
        logger.info(f"Generated audio {job['prompt_index']+1}: {audio_s3_url}")
    
    completed_jobs.sort(key=lambda x: x['prompt_index'])
    generated_audio_s3_urls = [job['audio_s3_url'] for job in completed_jobs]
    
    return generated_audio_s3_urls

def _extract_audio_prompts_from_plan(plan: List[Dict[str, Any]]) -> List[str]:
    """
    Extract audio generation prompts from the analysis plan.
    
    Args:
        plan: The analysis plan as a list of segment dictionaries with 'start', 'end', and 'prompt' fields
    
    Returns:
        List[str]: List of audio prompts to generate
    """
    audio_prompts = []
    
    if isinstance(plan, list):
        for segment in plan:
            if isinstance(segment, dict) and 'prompt' in segment:
                audio_prompts.append(segment['prompt'])
    
    if not audio_prompts:
        logger.warning("No audio prompts found in plan, using fallback")
        audio_prompts = ["Cinematic background music with emotional depth"]
    
    return audio_prompts

def lambda_handler(event, context):
    """
    Generate audio using MusicGen model on SageMaker Async Inference.
    
    Args:
        event: Step function event with job details and plan
        context: Lambda context
    
    Returns:
        dict: Updated event with generated audio S3 URLs
    """
    try:
        logger.info("Audio Generator Lambda started")
        
        validate_event(
            event,
            required_fields=[EventFields.JOB_ID, EventFields.STATUS, EventFields.PLAN]
        )
        
        job_id = event.get(EventFields.JOB_ID)
        plan = event.get(EventFields.PLAN)
        
        logger.info(f"Processing audio generation for job: {job_id}")
        
        audio_prompts = _extract_audio_prompts_from_plan(plan)
        logger.info(f"Extracted {len(audio_prompts)} audio prompts from plan")
        
        generated_audio_s3_urls = _generate_audio_for_prompts(audio_prompts, job_id)
        
        if not generated_audio_s3_urls:
            raise ValueError("No audio files were generated")
        
        logger.info(f"Generated {len(generated_audio_s3_urls)} audio files")
        
        updated_plan = plan.copy()
        if isinstance(updated_plan, list):
            for i, segment in enumerate(updated_plan):
                if i < len(generated_audio_s3_urls) and generated_audio_s3_urls[i]:
                    segment['audio_s3_url'] = generated_audio_s3_urls[i]
        else:
            logger.warning("Plan structure not as expected, adding audio URLs as separate field")
            updated_plan = {
                'segments': plan if isinstance(plan, list) else [],
                'generated_audio_s3_urls': generated_audio_s3_urls
            }
        
        update_field_in_dynamodb(
            jobs_table,
            job_id,
            {
                EventFields.STATUS: JobStatus.AUDIO_GENERATED,
                EventFields.PLAN: updated_plan,
                EventFields.UPDATED_AT: datetime.now(timezone.utc).isoformat()
            }
        )
        
        event[EventFields.STATUS] = JobStatus.AUDIO_GENERATED
        event[EventFields.PLAN] = updated_plan
        
        logger.info("Audio generation completed successfully")
        return event
        
    except Exception as e:
        logger.error(f"Error in audio generator lambda: {str(e)}")
        
        try:
            update_field_in_dynamodb(
                jobs_table,
                event.get(EventFields.JOB_ID, 'unknown'),
                {
                    EventFields.STATUS: JobStatus.FAILED,
                    EventFields.UPDATED_AT: datetime.now(timezone.utc).isoformat()
                }
            )
        except Exception as db_error:
            logger.error(f"Failed to update job status in DynamoDB: {str(db_error)}")
        
        raise RuntimeError(f"Audio generation failed: {str(e)}")