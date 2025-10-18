import os
import json
import boto3
import uuid

from models import UploadInfo, LambdaResponse, FailureResponse

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

        uploadInfo = UploadInfo(
            upload_url=presigned_url,
            s3_path=f"s3://{BUCKET_NAME}/{file_key}"
        )

        return LambdaResponse(
            status_code=200,
            body=uploadInfo.to_dict()
        ).to_dict()
    
    except Exception as e:
        print(f"Error: {e}")
        return FailureResponse(
            error="InternalServerError",
            error_code=500,
            message="An internal error occurred while creating the upload URL."
        ).to_dict()