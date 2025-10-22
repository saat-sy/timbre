import json
from dataclasses import dataclass, asdict, field

@dataclass
class LambdaResponse:
    status_code: int
    body: dict

    def to_dict(self):
        return {
            'statusCode': self.status_code,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                'Content-Type': 'application/json'
            },
            'body': json.dumps(self.body)
        }
    
    def to_json(self):
        return json.dumps(self.to_dict())
    
@dataclass
class Job:
    job_id: str
    user_id: str
    s3_url: str
    prompts: list
    status: str
    operation_type: str
    final_url: str = ""
    summary: str = ""
    agent_session_id: str = ""
    created_at: str = ""
    updated_at: str = ""

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
