'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SimpleVideoUpload } from './simple-video-upload';
import { ProcessingStatus } from './processing-status';
import { jobService } from '../../lib/jobs';
import { useErrorHandler } from '../../lib/utils/error-handler';
import { ErrorBanner, useErrorState } from '../ui/error-banner';

export function UploadPage() {
  const router = useRouter();
  const { error, isRetryable, showError, clearError } = useErrorState();
  const { handleUploadError, isRetryable: checkRetryable } = useErrorHandler();
  const [loadingStep, setLoadingStep] = useState<'uploading' | 'scheduling' | null>(null);

  // Store last submission for retry
  let lastSubmission: { file: File; prompt: string } | null = null;

  const handleSubmit = async (file: File, prompt: string, onProgress?: (step: 'uploading' | 'scheduling' | null) => void) => {
    clearError();
    lastSubmission = { file, prompt };

    try {
      const result = await jobService.uploadAndSubmitJob(file, prompt, {
        onUploadStart: () => {
          setLoadingStep('uploading');
          onProgress?.('uploading');
        },
        onUploadComplete: () => {
          // Keep uploading state until scheduling starts
        },
        onSchedulingStart: () => {
          setLoadingStep('scheduling');
          onProgress?.('scheduling');
        },
        onSchedulingComplete: () => {
          setLoadingStep(null);
          onProgress?.(null);
        }
      });

      clearError();
      lastSubmission = null;
      router.push(`/dashboard/${result.jobId}`);
    } catch (err) {
      setLoadingStep(null);
      onProgress?.(null);
      const errorMessage = handleUploadError(err);
      const canRetry = checkRetryable(err);
      showError(errorMessage, canRetry);
      console.error('Failed to submit job:', err);
    }
  };

  const handleRetry = () => {
    if (lastSubmission) {
      handleSubmit(lastSubmission.file, lastSubmission.prompt);
    }
  };

  return (
    <div className="h-full px-6 flex flex-col">
      {/* Processing Status - at top */}
      <div className="flex justify-center pt-6 pb-4">
        <div className="w-full max-w-4xl">
          <ProcessingStatus />
        </div>
      </div>

      {/* Error Banner - below processing status */}
      {error && (
        <div className="flex justify-center pb-4">
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
        <SimpleVideoUpload onSubmit={handleSubmit} loadingStep={loadingStep} />
      </div>
    </div>
  );
}