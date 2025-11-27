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
    'uploading' | 'composing' | null
  >(null);

  // Store last submission for retry
  let lastSubmission: { file: File } | null = null;

  const handleSubmit = async (
    file: File,
    onProgress?: (step: 'uploading' | 'composing' | null) => void
  ) => {
    clearError();
    lastSubmission = { file };

    try {
      setLoadingStep('uploading');
      onProgress?.('uploading');

      // Call REST API endpoint
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const formData = new FormData();
      formData.append('file', file);

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

      // Switch to composing state after upload completes
      setLoadingStep('composing');
      onProgress?.('composing');

      const data = await response.json();
      const sessionId = data.session_id;

      // Store video URL in sessionStorage for the video player page
      const videoUrl = URL.createObjectURL(file);
      sessionStorage.setItem(
        `video_${sessionId}`,
        JSON.stringify({
          videoUrl,
          fileName: file.name,
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
      handleSubmit(lastSubmission.file);
    }
  };

  return (
    <div className="h-full relative overflow-hidden pt-16">
      {/* Error Banner - absolute positioned below sidebar */}
      {error && (
        <div className="absolute top-6 left-0 right-0 z-50 flex justify-center px-6">
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

      {/* Centered Upload Interface - full remaining height */}
      <div className="h-full">
        <VideoUploadForm onSubmit={handleSubmit} loadingStep={loadingStep} />
      </div>
    </div>
  );
}
