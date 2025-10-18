import json
from dataclasses import dataclass, asdict

@dataclass
class LambdaResponse:
    status_code: int
    body: dict

    def to_dict(self):
        return {
            'statusCode': self.status_code,
            'body': json.dumps(self.body)
        }
    
    def to_json(self):
        return json.dumps(self.to_dict())
    
@dataclass
class FailureResponse:
    error: str
    error_code: int
    message: str = ""

    def to_dict(self):
        response = {
            'error': self.error,
            'statusCode': self.error_code,
            'message': self.message
        }
        return response
    
    def to_json(self):
        return json.dumps(self.to_dict())
    
@dataclass
class Job:
    job_id: str
    user_id: str
    s3_path: str
    prompts: list
    status: str
    operation_type: str
    final_url: str
    summary: str
    created_at: str
    updated_at: str

    def to_dict(self):
        return asdict(self)
    
    def to_json(self):
        return json.dumps(self.to_dict())
    
@dataclass
class UploadInfo:
    upload_url: str
    s3_path: str

    def to_dict(self):
        return asdict(self)
    
    def to_json(self):
        return json.dumps(self.to_dict())
    
