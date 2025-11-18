'use client';

import { useState } from 'react';
import { VideoUploadForm } from '../upload/VideoUploadForm';
import { useErrorHandler } from '../../../lib/utils/error-handler';
import { ErrorBanner, useErrorState } from '../../ui/error-banner';

export function UploadPage() {
  const { error, isRetryable, showError, clearError } = useErrorState();
  const { handleUploadError, isRetryable: checkRetryable } = useErrorHandler();
  const [loadingStep, setLoadingStep] = useState<'uploading' | 'scheduling' | null>(null);

  // Store last submission for retry
  let lastSubmission: { file: File; prompt: string } | null = null;

  const handleSubmit = async (file: File, prompt: string, onProgress?: (step: 'uploading' | 'scheduling' | null) => void) => {
    clearError();
    lastSubmission = { file, prompt };

    try {
      // TODO: Implement upload logic with new API
      setLoadingStep('uploading');
      onProgress?.('uploading');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setLoadingStep(null);
      onProgress?.(null);
      clearError();
      lastSubmission = null;
      
      // Success - you can add success notification here
      console.log('Upload successful:', file.name);
    } catch (err) {
      setLoadingStep(null);
      onProgress?.(null);
      const errorMessage = handleUploadError(err);
      const canRetry = checkRetryable(err);
      showError(errorMessage, canRetry);
      console.error('Failed to submit:', err);
    }
  };

  const handleRetry = () => {
    if (lastSubmission) {
      handleSubmit(lastSubmission.file, lastSubmission.prompt);
    }
  };

  return (
    <div className="h-full px-6 flex flex-col">
      {/* Error Banner */}
      {error && (
        <div className="flex justify-center pt-6 pb-4">
          <div className="w-full max-w-4xl">
            <ErrorBanner
              error={error}
              title="Upload Failed"
              isRetryable={isRetryable && !!lastSubmission}
              onRetry={handleRetry}
              onDismiss={clearError}
              variant="banner"
              size="md"
            />
          </div>
        </div>
      )}

      {/* Centered Upload Interface - takes remaining space */}
      <div className="flex-1 flex items-center justify-center">
        <VideoUploadForm onSubmit={handleSubmit} loadingStep={loadingStep} />
      </div>
    </div>
  );
}