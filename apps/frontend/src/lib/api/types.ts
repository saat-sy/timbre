// API Types based on backend models

export interface UploadUrlRequest {
  filename: string;
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
  error_code?: number;
  message: string;
}

export type ApiErrorType = 
  | 'ValidationError'
  | 'NotFoundError' 
  | 'UnauthorizedError'
  | 'DatabaseError'
  | 'ExecutionError'
  | 'InternalServerError'
  | 'NetworkError'
  | 'UploadError'
  | 'AuthenticationError';

export class ApiException extends Error {
  public readonly errorType: ApiErrorType;
  public readonly statusCode: number;
  public readonly originalError?: unknown;

  constructor(
    errorType: ApiErrorType,
    message: string,
    statusCode: number = 500,
    originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiException';
    this.errorType = errorType;
    this.statusCode = statusCode;
    this.originalError = originalError;
  }

  static fromApiError(error: ApiError, statusCode: number): ApiException {
    return new ApiException(
      error.error as ApiErrorType,
      error.message,
      statusCode
    );
  }

  static fromNetworkError(error: unknown, statusCode: number = 0): ApiException {
    const message = error instanceof Error ? error.message : 'Network request failed';
    return new ApiException('NetworkError', message, statusCode, error);
  }

  static fromUploadError(statusCode: number): ApiException {
    return new ApiException(
      'UploadError',
      `File upload failed with status ${statusCode}`,
      statusCode
    );
  }

  isRetryable(): boolean {
    return this.errorType === 'NetworkError' || 
           this.statusCode >= 500 ||
           this.statusCode === 429; // Rate limiting
  }

  getUserFriendlyMessage(): string {
    switch (this.errorType) {
      case 'ValidationError':
        return this.message;
      case 'NotFoundError':
        return 'The requested resource was not found.';
      case 'UnauthorizedError':
        return 'You do not have permission to access this resource.';
      case 'AuthenticationError':
        return 'Please sign in to continue.';
      case 'DatabaseError':
        return 'A database error occurred. Please try again.';
      case 'ExecutionError':
        return 'Failed to start job processing. Please try again.';
      case 'UploadError':
        return 'File upload failed. Please check your file and try again.';
      case 'NetworkError':
        return 'Network error. Please check your connection and try again.';
      case 'InternalServerError':
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

export type JobStatus = JobStatusResponse['status'];