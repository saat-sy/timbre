import json
import boto3
import os

JOBS_TABLE = os.environ['JOBS_TABLE']

dynamodb = boto3.resource('dynamodb')
jobs_table = dynamodb.Table(JOBS_TABLE)

def update_status(event):
    job_id = event['job_id']
    new_status = event['COMPLETED']
    
    new_final_url = event.get('final_url')
    new_summary = event.get('summary')
    
    try:
        update_expressions = ['#status = :status']
        expression_attribute_names = {'#status': 'status'}
        expression_attribute_values = {':status': new_status}
        
        if new_final_url is not None:
            update_expressions.append('#final_url = list_append(if_not_exists(#final_url, :empty_list), :final_url)')
            expression_attribute_names['#final_url'] = 'final_url'
            expression_attribute_values[':final_url'] = [new_final_url]
            expression_attribute_values[':empty_list'] = []
        
        if new_summary is not None:
            update_expressions.append('#summary = list_append(if_not_exists(#summary, :empty_list2), :summary)')
            expression_attribute_names['#summary'] = 'summary'
            expression_attribute_values[':summary'] = [new_summary]
            expression_attribute_values[':empty_list2'] = []
        
        jobs_table.update_item(
            Key={'job_id': job_id},
            UpdateExpression='SET ' + ', '.join(update_expressions),
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )
        print(f"Updated job {job_id} status to {new_status}")
        if new_final_url:
            print(f"Appended final_url: {new_final_url}")
        if new_summary:
            print(f"Appended summary: {new_summary}")
    except Exception as e:
        print(f"Error updating job status: {e}")


def lambda_handler(event, context):
    print("--- 1. Coordinator Lambda ---")
    print(f"Received job: {json.dumps(event)}")
    if event.get('status') == 'PROCESSED':
        update_status(event)
        
    # Pass the input to the next step
    return event