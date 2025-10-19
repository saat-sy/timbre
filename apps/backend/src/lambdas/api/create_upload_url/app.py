import os
import json
import boto3
import uuid
import logging

from models import UploadInfo, LambdaResponse

logger = logging.getLogger()
logger.setLevel(logging.INFO)

BUCKET_NAME = os.environ['BUCKET_NAME']
s3 = boto3.client('s3')

def lambda_handler(event, _):
    """
    Creates a presigned S3 upload URL for file uploads.
    
    Args:
        event: Request body with filename and optional contentType
    
    Returns:
        dict: HTTP response with upload_url and s3_path
    """
    user_id = event['requestContext']['authorizer']['claims']['sub']
    logger.info(f"Creating upload URL for user: {user_id}")

    try:
        body = json.loads(event.get('body', '{}'))
        filename = body.get('filename')
        if not filename:
            return LambdaResponse(400, {"error": "ValidationError", "message": "Missing filename"}).to_dict()

        file_key = f"uploads/{user_id}/{uuid.uuid4()}-{filename}"
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={'Bucket': BUCKET_NAME, 'Key': file_key, 'ContentType': body.get('contentType', 'application/octet-stream')},
            ExpiresIn=3600
        )

        upload_info = UploadInfo(upload_url=presigned_url, s3_path=f"s3://{BUCKET_NAME}/{file_key}")
        return LambdaResponse(200, upload_info.to_dict()).to_dict()
    
    except json.JSONDecodeError:
        return LambdaResponse(400, {"error": "ValidationError", "message": "Invalid JSON in request body"}).to_dict()
    except Exception as e:
        logger.error(f"Error creating upload URL: {e}")
        return LambdaResponse(500, {"error": "InternalServerError", "message": "An internal error occurred while creating the upload URL."}).to_dict()