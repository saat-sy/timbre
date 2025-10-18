import os
import json
import boto3
import uuid

s3 = boto3.client('s3')
BUCKET_NAME = os.environ['BUCKET_NAME']

def lambda_handler(event, _):
    claims = event['requestContext']['authorizer']['claims']
    user_id = claims['sub']

    try:
        body = json.loads(event.get('body', '{}'))
        filename = body.get('filename')
        if not filename:
            return {'statusCode': 400, 'body': json.dumps({'message': 'Missing filename'})}

        file_key = f"uploads/{user_id}/{uuid.uuid4()}-{filename}"

        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={'Bucket': BUCKET_NAME, 'Key': file_key, 'ContentType': body.get('contentType', 'application/octet-stream')},
            ExpiresIn=3600
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'upload_url': presigned_url,
                's3_path': f"s3://{BUCKET_NAME}/{file_key}"
            })
        }
    except Exception as e:
        print(f"Error: {e}")
        return {'statusCode': 500, 'body': json.dumps({'message': 'Internal server error'})}