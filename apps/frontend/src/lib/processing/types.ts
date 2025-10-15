export interface ProcessingJob {
  id: string;
  videoFile: File;
  prompt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  resultUrl?: string;
  estimatedTimeRemaining?: number;
}

export interface ProcessingQueue {
  jobs: ProcessingJob[];
  activeJob?: ProcessingJob;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
}

export interface ProcessingResult {
  id: string;
  originalVideoUrl: string;
  processedVideoUrl: string;
  audioUrl: string;
  prompt: string;
  processingTime: number;
  createdAt: Date;
}

export type ProcessingStatus = ProcessingJob['status'];

export interface ProcessingError {
  code: string;
  message: string;
  details?: string;
  retryable: boolean;
}