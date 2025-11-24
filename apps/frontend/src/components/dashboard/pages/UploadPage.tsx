'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VideoUploadForm } from '../upload/VideoUploadForm';
import { useErrorHandler } from '../../../lib/utils/error-handler';
import { ErrorBanner, useErrorState } from '../../ui/error-banner';
import { amplifyAuth } from '../../../lib/auth';

export function UploadPage() {
  const router = useRouter();
  const { error, isRetryable, showError, clearError } = useErrorState();
  const { handleUploadError, isRetryable: checkRetryable } = useErrorHandler();
  const [loadingStep, setLoadingStep] = useState<
    'uploading' | 'scheduling' | null
  >(null);

  // Store last submission for retry
  let lastSubmission: { file: File; prompt: string } | null = null;

  const handleSubmit = async (
    file: File,
    prompt: string,
    onProgress?: (step: 'uploading' | 'scheduling' | null) => void
  ) => {
    clearError();
    lastSubmission = { file, prompt };

    try {
      setLoadingStep('uploading');
      onProgress?.('uploading');

      // Call REST API endpoint
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('prompt', prompt);

      const token = await amplifyAuth.getIdToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}/api/context`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const sessionId = data.session_id;

      // Store video URL in sessionStorage for the video player page
      const videoUrl = URL.createObjectURL(file);
      sessionStorage.setItem(
        `video_${sessionId}`,
        JSON.stringify({
          videoUrl,
          fileName: file.name,
          prompt,
        })
      );

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
      <div className="flex-1 flex items-center justify-center overflow-hidden mt-24">
        <VideoUploadForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
