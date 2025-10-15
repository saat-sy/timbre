import { ProcessingJob, ProcessingQueue, ProcessingResult, ProcessingError } from './processing-types';

class ProcessingService {
  private jobs: Map<string, ProcessingJob> = new Map();
  private queue: ProcessingJob[] = [];
  private activeJob: ProcessingJob | null = null;
  private isProcessing = false;
  private listeners: Set<(queue: ProcessingQueue) => void> = new Set();

  // Generate unique job ID
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add job to queue
  addJob(videoFile: File, prompt: string): ProcessingJob {
    const job: ProcessingJob = {
      id: this.generateJobId(),
      videoFile,
      prompt,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    this.queue.push(job);
    this.notifyListeners();
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processNextJob();
    }

    return job;
  }

  // Get job by ID
  getJob(id: string): ProcessingJob | undefined {
    return this.jobs.get(id);
  }

  // Get current queue state
  getQueue(): ProcessingQueue {
    const allJobs = Array.from(this.jobs.values());
    return {
      jobs: allJobs,
      activeJob: this.activeJob || undefined,
      totalJobs: allJobs.length,
      completedJobs: allJobs.filter(job => job.status === 'completed').length,
      failedJobs: allJobs.filter(job => job.status === 'failed').length,
    };
  }

  // Subscribe to queue updates
  subscribe(listener: (queue: ProcessingQueue) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  private notifyListeners(): void {
    const queue = this.getQueue();
    this.listeners.forEach(listener => listener(queue));
  }

  // Process next job in queue
  private async processNextJob(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift()!;
    this.activeJob = job;

    // Update job status
    job.status = 'processing';
    job.startedAt = new Date();
    this.jobs.set(job.id, job);
    this.notifyListeners();

    try {
      await this.simulateProcessing(job);
      
      // Mark as completed
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      job.resultUrl = this.generateMockResultUrl(job);
      
    } catch (error) {
      // Mark as failed
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = error instanceof Error ? error.message : 'Processing failed';
    }

    this.jobs.set(job.id, job);
    this.activeJob = null;
    this.isProcessing = false;
    this.notifyListeners();

    // Process next job if any
    if (this.queue.length > 0) {
      setTimeout(() => this.processNextJob(), 1000);
    }
  }

  // Simulate processing with progress updates
  private async simulateProcessing(job: ProcessingJob): Promise<void> {
    const stages = [
      { name: 'Analyzing video', duration: 2000, progress: 20 },
      { name: 'Processing audio prompt', duration: 1500, progress: 40 },
      { name: 'Generating music', duration: 4000, progress: 80 },
      { name: 'Finalizing output', duration: 1000, progress: 95 },
    ];

    let currentProgress = 0;

    for (const stage of stages) {
      const startTime = Date.now();
      const endTime = startTime + stage.duration;
      
      while (Date.now() < endTime) {
        const elapsed = Date.now() - startTime;
        const stageProgress = Math.min((elapsed / stage.duration) * (stage.progress - currentProgress), stage.progress - currentProgress);
        
        job.progress = Math.min(currentProgress + stageProgress, stage.progress);
        job.estimatedTimeRemaining = Math.max(0, endTime - Date.now() + 
          (stages.slice(stages.indexOf(stage) + 1).reduce((sum, s) => sum + s.duration, 0)));
        
        this.jobs.set(job.id, job);
        this.notifyListeners();
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      currentProgress = stage.progress;
    }

    // Small chance of failure for demonstration
    if (Math.random() < 0.1) {
      throw new Error('Processing failed due to unexpected error');
    }
  }

  // Generate mock result URL
  private generateMockResultUrl(job: ProcessingJob): string {
    return `https://example.com/results/${job.id}/processed_video.mp4`;
  }

  // Retry failed job
  retryJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'failed') {
      return false;
    }

    // Reset job state
    job.status = 'queued';
    job.progress = 0;
    job.error = undefined;
    job.startedAt = undefined;
    job.completedAt = undefined;
    job.estimatedTimeRemaining = undefined;

    this.queue.push(job);
    this.jobs.set(jobId, job);
    this.notifyListeners();

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processNextJob();
    }

    return true;
  }

  // Cancel job (only if queued)
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'queued') {
      return false;
    }

    // Remove from queue
    const queueIndex = this.queue.findIndex(q => q.id === jobId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
    }

    // Remove from jobs
    this.jobs.delete(jobId);
    this.notifyListeners();

    return true;
  }

  // Clear completed jobs
  clearCompleted(): void {
    const completedJobs = Array.from(this.jobs.values()).filter(job => job.status === 'completed');
    completedJobs.forEach(job => this.jobs.delete(job.id));
    this.notifyListeners();
  }

  // Get processing statistics
  getStats() {
    const allJobs = Array.from(this.jobs.values());
    const now = new Date();
    
    return {
      totalJobs: allJobs.length,
      completedJobs: allJobs.filter(job => job.status === 'completed').length,
      failedJobs: allJobs.filter(job => job.status === 'failed').length,
      queuedJobs: allJobs.filter(job => job.status === 'queued').length,
      processingJobs: allJobs.filter(job => job.status === 'processing').length,
      averageProcessingTime: this.calculateAverageProcessingTime(allJobs),
      todayJobs: allJobs.filter(job => 
        job.createdAt.toDateString() === now.toDateString()
      ).length,
    };
  }

  private calculateAverageProcessingTime(jobs: ProcessingJob[]): number {
    const completedJobs = jobs.filter(job => 
      job.status === 'completed' && job.startedAt && job.completedAt
    );
    
    if (completedJobs.length === 0) return 0;
    
    const totalTime = completedJobs.reduce((sum, job) => {
      const processingTime = job.completedAt!.getTime() - job.startedAt!.getTime();
      return sum + processingTime;
    }, 0);
    
    return totalTime / completedJobs.length;
  }
}

// Export singleton instance
export const processingService = new ProcessingService();