import json
import boto3
import os
import time

JOBS_TABLE = os.environ['JOBS_TABLE']

dynamodb = boto3.resource('dynamodb')
jobs_table = dynamodb.Table(JOBS_TABLE)

def update_status(event):
    job_id = event['job_id']
    
    new_final_url = f"s3://timbre-bucket/final/xdcfghj.mp4"
    new_summary = "Video processing completed successfully with AI-generated audio track."
    
    try:
        update_expressions = ['#status = :status']
        expression_attribute_names = {'#status': 'status'}
        expression_attribute_values = {':status': 'COMPLETED'}
        
        if new_final_url is not None:
            update_expressions.append('#final_url = :final_url')
            expression_attribute_names['#final_url'] = 'final_url'
            expression_attribute_values[':final_url'] = new_final_url
        
        if new_summary is not None:
            update_expressions.append('#summary = :summary')
            expression_attribute_names['#summary'] = 'summary'
            expression_attribute_values[':summary'] = new_summary
        
        response = jobs_table.update_item(
            Key={'job_id': job_id},
            UpdateExpression='SET ' + ', '.join(update_expressions),
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues='UPDATED_NEW'
        )
        print(f"Successfully updated job {job_id} status to COMPLETED")
        print(f"Updated attributes: {response.get('Attributes', {})}")
        if new_final_url:
            print(f"Set final_url: {new_final_url}")
        if new_summary:
            print(f"Set summary: {new_summary}")
    except Exception as e:
        print(f"Error updating job status: {e}")


def lambda_handler(event, context):
    print("--- Coordinator Lambda ---")
    time.sleep(2) 
    print(f"Received event: {json.dumps(event, indent=2)}")
    
    if event.get('status') == 'PROCESSED':
        print("Processing completed - updating job status to COMPLETED")
        update_status(event)
    else:
        print("Initial coordinator run - job starting")
        
    return event