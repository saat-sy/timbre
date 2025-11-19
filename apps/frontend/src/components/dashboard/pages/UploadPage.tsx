'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VideoUploadForm } from '../upload/VideoUploadForm';
import { useErrorHandler } from '../../../lib/utils/error-handler';
import { ErrorBanner, useErrorState } from '../../ui/error-banner';

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
      setLoadingStep('uploading');
      onProgress?.('uploading');

      // Call REST API endpoint (dummy for now)
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const sessionId = data.sessionId;

      // Store video URL in sessionStorage for the video player page
      const videoUrl = URL.createObjectURL(file);
      sessionStorage.setItem(`video_${sessionId}`, JSON.stringify({
        videoUrl,
        fileName: file.name,
        prompt,
      }));

      setLoadingStep(null);
      onProgress?.(null);
      clearError();
      lastSubmission = null;

      // Navigate to the video player page
      router.push(`/dashboard/${sessionId}`);
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Error Banner - fixed height to prevent layout shift */}
      <div className="flex justify-center pt-6 pb-4 min-h-[80px]">
        {error && (
          <div className="w-full max-w-4xl mx-auto px-6">
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
        )}
      </div>

      {/* Centered Upload Interface - takes remaining space */}
      <div className="flex-1 flex items-center justify-center overflow-hidden mt-12">
        <VideoUploadForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}