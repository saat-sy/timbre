'use client';

import { useRouter } from 'next/navigation';
import { SimpleVideoUpload } from './simple-video-upload';
import { ProcessingStatus } from './processing-status';
import { jobService } from '../../lib/jobs';

export function UploadPage() {
  const router = useRouter();

  const handleSubmit = async (file: File, prompt: string) => {
    try {
      const result = await jobService.uploadAndSubmitJob(file, prompt);
      // Navigate to the job progress page
      router.push(`/dashboard/${result.jobId}`);
    } catch (error) {
      console.error('Failed to submit job:', error);
      // You could show an error toast here
      alert('Failed to submit job. Please try again.');
    }
  };

  return (
    <div className="relative h-full px-6">
      {/* Processing Status - positioned at top */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-full max-w-4xl z-10">
        <ProcessingStatus />
      </div>

      {/* Centered Upload Interface */}
      <div className="h-full flex items-center justify-center">
        <SimpleVideoUpload onSubmit={handleSubmit} />
      </div>
    </div>
  );
}