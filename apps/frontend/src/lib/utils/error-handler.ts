// Simplified error handler without API gateway dependencies

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
      logError = true,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    let message: string;

    if (error instanceof Error) {
      message = error.message || fallbackMessage;
    } else {
      message = fallbackMessage;
    }

    if (logError) {
      console.error(`Error in ${context}:`, error);
    }

    return message;
  }

  static isRetryable(error: unknown): boolean {
    return false;
  }

  static handleUploadError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'File upload failed. Please try again.';
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

  return {
    handleError,
    isRetryable,
    handleUploadError: ErrorHandler.handleUploadError,
  };
}
