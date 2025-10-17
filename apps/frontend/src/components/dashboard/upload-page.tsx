'use client';

import { SimpleVideoUpload } from './simple-video-upload';
import { ProcessingStatus } from './processing-status';
import { processingService } from '../../lib/processing';

export function UploadPage() {
  return (
    <div className="relative h-full px-6">
      {/* Processing Status - positioned at top */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-full max-w-4xl z-10">
        <ProcessingStatus />
      </div>

      {/* Centered Upload Interface */}
      <div className="h-full flex items-center justify-center">
        <SimpleVideoUpload
          onSubmit={(file, prompt) => {
            processingService.addJob(file, prompt);
          }}
        />
      </div>
    </div>
  );
}