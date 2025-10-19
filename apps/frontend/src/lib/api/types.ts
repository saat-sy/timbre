// API Types based on backend models

export interface UploadUrlRequest {
  filename: string;
  contentType?: string;
}

export interface UploadUrlResponse {
  upload_url: string;
  s3_path: string;
}

export interface SubmitJobRequest {
  prompt: string;
  s3_path?: string;
  job_id?: string;
}

export interface SubmitJobResponse {
  message: string;
  job_id: string;
  operation_type: 'new' | 'regenerate';
}

export interface JobStatusResponse {
  job_id: string;
  user_id: string;
  s3_path: string;
  prompts: string[];
  status: 'SCHEDULED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  operation_type: string;
  final_url: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface UserJobsResponse {
  jobs: JobStatusResponse[];
  count: number;
  has_more: boolean;
}

export interface ApiError {
  error: string;
  error_code: number;
  message: string;
}

export type JobStatus = JobStatusResponse['status'];