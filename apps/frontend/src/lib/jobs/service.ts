import { apiClient } from '../api';
import type { JobStatusResponse, JobStatus } from '../api/types';

export interface JobSubmissionResult {
    jobId: string;
    operationType: 'new' | 'regenerate';
}

export interface JobProgress {
    jobId: string;
    status: JobStatus;
    progress: number;
    estimatedTimeRemaining?: number;
    error?: string;
    finalUrl?: string;
    summary?: string;
    createdAt: string;
    updatedAt: string;
}

class JobService {
    private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
    private listeners: Map<string, Set<(progress: JobProgress) => void>> = new Map();

    async uploadAndSubmitJob(file: File, prompt: string): Promise<JobSubmissionResult> {
        try {
            const uploadResponse = await apiClient.createUploadUrl({
                filename: file.name,
                contentType: file.type,
            });

            await apiClient.uploadFile(uploadResponse.upload_url, file);

            const jobResponse = await apiClient.submitJob({
                prompt,
                s3_path: uploadResponse.s3_path,
            });

            return {
                jobId: jobResponse.job_id,
                operationType: jobResponse.operation_type,
            };
        } catch (error) {
            console.error('Failed to upload and submit job:', error);
            throw error;
        }
    }

    async getJobProgress(jobId: string): Promise<JobProgress> {
        try {
            const response = await apiClient.getJobStatus(jobId);
            return this.mapJobStatusToProgress(response);
        } catch (error) {
            console.error(`Failed to get job progress for ${jobId}:`, error);
            throw error;
        }
    }

    startPolling(jobId: string, callback: (progress: JobProgress) => void, intervalMs = 5000): void {
        // Stop existing polling for this job
        this.stopPolling(jobId);

        // Add listener
        if (!this.listeners.has(jobId)) {
            this.listeners.set(jobId, new Set());
        }
        this.listeners.get(jobId)!.add(callback);

        // Start polling
        const poll = async () => {
            try {
                const progress = await this.getJobProgress(jobId);

                // Notify all listeners for this job
                const jobListeners = this.listeners.get(jobId);
                if (jobListeners) {
                    jobListeners.forEach(listener => listener(progress));
                }

                // Stop polling if job is complete or failed
                if (progress.status === 'COMPLETED' || progress.status === 'FAILED') {
                    this.stopPolling(jobId);
                }
            } catch (error) {
                console.error(`Polling error for job ${jobId}:`, error);

                // Notify listeners of error
                const errorProgress: JobProgress = {
                    jobId,
                    status: 'FAILED',
                    progress: 0,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                const jobListeners = this.listeners.get(jobId);
                if (jobListeners) {
                    jobListeners.forEach(listener => listener(errorProgress));
                }

                this.stopPolling(jobId);
            }
        };

        // Initial poll
        poll();

        // Set up interval
        const interval = setInterval(poll, intervalMs);
        this.pollingIntervals.set(jobId, interval);
    }

    stopPolling(jobId: string): void {
        const interval = this.pollingIntervals.get(jobId);
        if (interval) {
            clearInterval(interval);
            this.pollingIntervals.delete(jobId);
        }

        // Clean up listeners
        this.listeners.delete(jobId);
    }

    removeListener(jobId: string, callback: (progress: JobProgress) => void): void {
        const jobListeners = this.listeners.get(jobId);
        if (jobListeners) {
            jobListeners.delete(callback);

            // If no more listeners, stop polling
            if (jobListeners.size === 0) {
                this.stopPolling(jobId);
            }
        }
    }

    async getUserJobs(limit = 50): Promise<JobProgress[]> {
        try {
            const response = await apiClient.getUserJobs({ limit });
            return response.jobs.map(job => this.mapJobStatusToProgress(job));
        } catch (error) {
            console.error('Failed to get user jobs:', error);
            throw error;
        }
    }

    private mapJobStatusToProgress(job: JobStatusResponse): JobProgress {
        // Calculate progress based on status
        let progress = 0;
        switch (job.status) {
            case 'SCHEDULED':
                progress = 10;
                break;
            case 'PROCESSING':
                progress = 50; // Could be more sophisticated based on sub-steps
                break;
            case 'COMPLETED':
                progress = 100;
                break;
            case 'FAILED':
                progress = 0;
                break;
        }

        return {
            jobId: job.job_id,
            status: job.status,
            progress,
            finalUrl: job.final_url || undefined,
            summary: job.summary || undefined,
            error: job.status === 'FAILED' ? 'Job processing failed' : undefined,
            createdAt: job.created_at,
            updatedAt: job.updated_at,
        };
    }

    // Clean up all polling when service is destroyed
    cleanup(): void {
        this.pollingIntervals.forEach((interval) => clearInterval(interval));
        this.pollingIntervals.clear();
        this.listeners.clear();
    }
}

export const jobService = new JobService();