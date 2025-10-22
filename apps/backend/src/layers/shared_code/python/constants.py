class Constants:
    SUMMARY_MODEL = "us.amazon.nova-lite-v1:0"

    @staticmethod
    def get_summary_prompt(prompt, plan):
        return (
            f"Given the following video analysis prompt and execution plan, generate a concise summary that captures:\n"
            f"1. The video's key characteristics (length, scene structure, emotional tone)\n"
            f"2. The planned audio generation approach (number of segments, musical styles)\n"
            f"3. How the multimodal analysis informed the audio prompts\n\n"
            f"Original Prompt: {prompt}\n\n"
            f"Execution Plan: {plan}\n\n"
            f"Summary:"
        )

class EventFields:
    JOB_ID = 'job_id'
    STATUS = 'status'
    FINAL_URL = 'final_url'
    SUMMARY = 'summary'
    USER_ID = 'user_id'
    S3_URL = 's3_url'
    PROMPTS = 'prompts'
    OPERATION_TYPE = 'operation_type'
    AGENT_SESSION_ID = 'agent_session_id'
    PLAN = 'plan'
    UPDATED_AT = 'updated_at'
    ERROR = 'error'

class JobStatus:
    SCHEDULED = 'SCHEDULED'
    PROCESSING = 'PROCESSING'
    ANALYZED = 'ANALYZED'
    AUDIO_GENERATED = 'AUDIO_GENERATED'
    PROCESSED = 'PROCESSED'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'

class OperationType:
    NEW = 'new'
    REGENERATE = 'regenerate'
