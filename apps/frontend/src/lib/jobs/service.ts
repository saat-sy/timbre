import { apiClient } from '../api';
import type { JobStatusResponse, JobStatus } from '../api/types';
import { ApiException } from '../api/types';

export interface JobSubmissionResult {
    jobId: string;
    operationType: 'new' | 'regenerate';
}

export interface UploadProgressCallback {
    onUploadStart?: () => void;
    onUploadProgress?: (progress: number) => void;
    onUploadComplete?: () => void;
    onSchedulingStart?: () => void;
    onSchedulingComplete?: () => void;
}

export interface JobProgress {
    jobId: string;
    status: JobStatus;
    progress: number;
    estimatedTimeRemaining?: number;
    error?: string;
    errorType?: string;
    isRetryable?: boolean;
    finalUrl?: string;
    summary?: string;
    createdAt: string;
    updatedAt: string;
}

export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
}

class JobService {
    private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
    private listeners: Map<string, Set<(progress: JobProgress) => void>> = new Map();
    private retryConfig: RetryConfig = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
    };

    async uploadAndSubmitJob(
        file: File, 
        prompt: string, 
        callbacks?: UploadProgressCallback
    ): Promise<JobSubmissionResult> {
        return this.withRetry(async () => {
            // Validate inputs before making API calls
            this.validateJobInputs(file, prompt);

            callbacks?.onUploadStart?.();

            let uploadResponse;
            try {
                uploadResponse = await apiClient.createUploadUrl({
                    filename: file.name,
                    contentType: file.type || 'application/octet-stream',
                });
            } catch (error) {
                if (error instanceof ApiException) {
                    throw new ApiException(
                        error.errorType,
                        `Failed to create upload URL: ${error.getUserFriendlyMessage()}`,
                        error.statusCode,
                        error
                    );
                }
                throw error;
            }

            try {
                callbacks?.onUploadProgress?.(50); // Halfway through upload process
                await apiClient.uploadFile(uploadResponse.upload_url, file);
                callbacks?.onUploadComplete?.();
            } catch (error) {
                if (error instanceof ApiException) {
                    throw new ApiException(
                        error.errorType,
                        `File upload failed: ${error.getUserFriendlyMessage()}`,
                        error.statusCode,
                        error
                    );
                }
                throw error;
            }

            try {
                callbacks?.onSchedulingStart?.();
                const jobResponse = await apiClient.submitJob({
                    prompt,
                    s3_path: uploadResponse.s3_path,
                });
                callbacks?.onSchedulingComplete?.();

                return {
                    jobId: jobResponse.job_id,
                    operationType: jobResponse.operation_type,
                };
            } catch (error) {
                if (error instanceof ApiException) {
                    throw new ApiException(
                        error.errorType,
                        `Job submission failed: ${error.getUserFriendlyMessage()}`,
                        error.statusCode,
                        error
                    );
                }
                throw error;
            }
        });
    }

    private validateJobInputs(file: File, prompt: string): void {
        const errors: string[] = [];

        if (!file) {
            errors.push('File is required');
        } else {
            // Check file size (e.g., 100MB limit)
            const maxSize = 100 * 1024 * 1024;
            if (file.size > maxSize) {
                errors.push('File size must be less than 100MB');
            }

            // Check file type if needed
            const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf'];
            if (!allowedTypes.some(type => file.type.startsWith(type))) {
                errors.push('File type not supported');
            }
        }

        if (!prompt || typeof prompt !== 'string') {
            errors.push('Prompt is required');
        } else if (prompt.trim().length === 0) {
            errors.push('Prompt cannot be empty');
        } else if (prompt.length > 1000) {
            errors.push('Prompt must be less than 1000 characters');
        }

        if (errors.length > 0) {
            throw new ApiException(
                'ValidationError',
                `Validation errors: ${errors.join('; ')}`,
                400
            );
        }
    }

    private async withRetry<T>(
        operation: () => Promise<T>,
        retryConfig: RetryConfig = this.retryConfig
    ): Promise<T> {
        let lastError: ApiException | Error | undefined;
        
        for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as ApiException | Error;
                
                // Don't retry on the last attempt
                if (attempt === retryConfig.maxRetries) {
                    break;
                }

                // Only retry if the error is retryable
                if (error instanceof ApiException && !error.isRetryable()) {
                    break;
                }

                // Calculate delay with exponential backoff
                const delay = Math.min(
                    retryConfig.baseDelay * Math.pow(2, attempt),
                    retryConfig.maxDelay
                );

                console.warn(`Operation failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}), retrying in ${delay}ms:`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError || new Error('Operation failed with unknown error');
    }

    async getJobProgress(jobId: string): Promise<JobProgress> {
        return this.withRetry(async () => {
            try {
                const response = await apiClient.getJobStatus(jobId);
                return this.mapJobStatusToProgress(response);
            } catch (error) {
                if (error instanceof ApiException) {
                    // For job status requests, provide more specific error handling
                    if (error.errorType === 'NotFoundError') {
                        throw new ApiException(
                            'NotFoundError',
                            `Job ${jobId} not found. It may have been deleted or never existed.`,
                            404,
                            error
                        );
                    }
                    throw new ApiException(
                        error.errorType,
                        `Failed to get job status: ${error.getUserFriendlyMessage()}`,
                        error.statusCode,
                        error
                    );
                }
                throw error;
            }
        }, { ...this.retryConfig, maxRetries: 2 }); // Fewer retries for status checks
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

                // Create error progress with detailed information
                const apiError = error instanceof ApiException ? error : null;
                const errorProgress: JobProgress = {
                    jobId,
                    status: 'FAILED',
                    progress: 0,
                    error: apiError ? apiError.getUserFriendlyMessage() : 
                           (error instanceof Error ? error.message : 'Unknown error'),
                    errorType: apiError?.errorType,
                    isRetryable: apiError?.isRetryable(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                const jobListeners = this.listeners.get(jobId);
                if (jobListeners) {
                    jobListeners.forEach(listener => listener(errorProgress));
                }

                // Only stop polling for non-retryable errors
                if (!apiError?.isRetryable()) {
                    this.stopPolling(jobId);
                }
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
        return this.withRetry(async () => {
            try {
                const response = await apiClient.getUserJobs({ limit });
                return response.jobs.map(job => this.mapJobStatusToProgress(job));
            } catch (error) {
                if (error instanceof ApiException) {
                    throw new ApiException(
                        error.errorType,
                        `Failed to get user jobs: ${error.getUserFriendlyMessage()}`,
                        error.statusCode,
                        error
                    );
                }
                throw error;
            }
        }, { ...this.retryConfig, maxRetries: 2 });
    }

    private mapJobStatusToProgress(job: JobStatusResponse): JobProgress {
        // Calculate progress based on status
        let progress = 0;
        switch (job.status) {
            case 'SCHEDULED':
                progress = 10;
                break;
            case 'PROCESSING':
                progress = 25;
                break;
            case 'ANALYZED':
                progress = 50;
                break;
            case 'AUDIO_GENERATED':
                progress = 75;
                break;
            case 'PROCESSED':
                progress = 90;
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

    // Method to regenerate a job with error handling
    async regenerateJob(jobId: string, prompt: string): Promise<JobSubmissionResult> {
        return this.withRetry(async () => {
            this.validateRegenerateInputs(jobId, prompt);

            try {
                const jobResponse = await apiClient.submitJob({
                    prompt,
                    job_id: jobId,
                });

                return {
                    jobId: jobResponse.job_id,
                    operationType: jobResponse.operation_type,
                };
            } catch (error) {
                if (error instanceof ApiException) {
                    throw new ApiException(
                        error.errorType,
                        `Job regeneration failed: ${error.getUserFriendlyMessage()}`,
                        error.statusCode,
                        error
                    );
                }
                throw error;
            }
        });
    }

    private validateRegenerateInputs(jobId: string, prompt: string): void {
        const errors: string[] = [];

        if (!jobId || typeof jobId !== 'string') {
            errors.push('Job ID is required');
        }

        if (!prompt || typeof prompt !== 'string') {
            errors.push('Prompt is required');
        } else if (prompt.trim().length === 0) {
            errors.push('Prompt cannot be empty');
        } else if (prompt.length > 1000) {
            errors.push('Prompt must be less than 1000 characters');
        }

        if (errors.length > 0) {
            throw new ApiException(
                'ValidationError',
                `Validation errors: ${errors.join('; ')}`,
                400
            );
        }
    }

    // Method to check if an error is recoverable
    isErrorRecoverable(error: unknown): boolean {
        if (error instanceof ApiException) {
            return error.isRetryable();
        }
        return false;
    }

    // Method to get user-friendly error message
    getErrorMessage(error: unknown): string {
        if (error instanceof ApiException) {
            return error.getUserFriendlyMessage();
        }
        if (error instanceof Error) {
            return error.message;
        }
        return 'An unexpected error occurred';
    }

    // Clean up all polling when service is destroyed
    cleanup(): void {
        this.pollingIntervals.forEach((interval) => clearInterval(interval));
        this.pollingIntervals.clear();
        this.listeners.clear();
    }
}

export const jobService = new JobService();