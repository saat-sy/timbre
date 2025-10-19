import { ApiException, type ApiErrorType } from '../api/types';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
}

export class ErrorHandler {
  static handle(
    error: unknown,
    context: string,
    options: ErrorHandlerOptions = {}
  ): string {
    const {
      showToast = false,
      logError = true,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    let message: string;
    let shouldLog = logError;

    if (error instanceof ApiException) {
      message = error.getUserFriendlyMessage();
      
      if (error.errorType === 'ValidationError') {
        shouldLog = false;
      }
    } else if (error instanceof Error) {
      message = error.message || fallbackMessage;
    } else {
      message = fallbackMessage;
    }

    if (shouldLog) {
      console.error(`Error in ${context}:`, error);
    }

    return message;
  }

  static isRetryable(error: unknown): boolean {
    if (error instanceof ApiException) {
      return error.isRetryable();
    }
    return false;
  }

  static getErrorType(error: unknown): ApiErrorType | 'UnknownError' {
    if (error instanceof ApiException) {
      return error.errorType;
    }
    return 'UnknownError';
  }

  static createUserFriendlyError(
    errorType: ApiErrorType,
    technicalMessage: string,
    userMessage?: string
  ): ApiException {
    return new ApiException(
      errorType,
      userMessage || technicalMessage,
      500
    );
  }

  static handleUploadError(error: unknown): string {
    if (error instanceof ApiException) {
      switch (error.errorType) {
        case 'ValidationError':
          return 'Please check your file and try again. ' + error.message;
        case 'UploadError':
          return 'File upload failed. Please check your internet connection and try again.';
        case 'AuthenticationError':
          return 'Please sign in to upload files.';
        default:
          return error.getUserFriendlyMessage();
      }
    }
    return 'File upload failed. Please try again.';
  }

  static handleJobSubmissionError(error: unknown): string {
    if (error instanceof ApiException) {
      switch (error.errorType) {
        case 'ValidationError':
          return error.message;
        case 'DatabaseError':
          return 'Unable to save your job. Please try again.';
        case 'ExecutionError':
          return 'Unable to start job processing. Please try again.';
        case 'AuthenticationError':
          return 'Please sign in to submit jobs.';
        default:
          return error.getUserFriendlyMessage();
      }
    }
    return 'Job submission failed. Please try again.';
  }

  static handleJobStatusError(error: unknown, jobId: string): string {
    if (error instanceof ApiException) {
      switch (error.errorType) {
        case 'NotFoundError':
          return `Job ${jobId} was not found. It may have been deleted.`;
        case 'UnauthorizedError':
          return 'You do not have permission to view this job.';
        case 'AuthenticationError':
          return 'Please sign in to view job status.';
        default:
          return error.getUserFriendlyMessage();
      }
    }
    return 'Unable to get job status. Please try again.';
  }
}

export function useErrorHandler() {
  const handleError = (
    error: unknown,
    context: string,
    options?: ErrorHandlerOptions
  ) => {
    return ErrorHandler.handle(error, context, options);
  };

  const isRetryable = (error: unknown) => {
    return ErrorHandler.isRetryable(error);
  };

  const getErrorType = (error: unknown) => {
    return ErrorHandler.getErrorType(error);
  };

  return {
    handleError,
    isRetryable,
    getErrorType,
    handleUploadError: ErrorHandler.handleUploadError,
    handleJobSubmissionError: ErrorHandler.handleJobSubmissionError,
    handleJobStatusError: ErrorHandler.handleJobStatusError,
  };
}