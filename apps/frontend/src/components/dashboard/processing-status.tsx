"use client";

import { useState, useEffect } from "react";
import { LiquidGlassCard } from "@repo/ui/liquid-glass-card";
import { GradientButton } from "@repo/ui/gradient-button";
import { processingService, ProcessingJob, ProcessingQueue } from "../../lib/processing";

interface ProcessingStatusProps {
  className?: string;
}

export function ProcessingStatus({ className }: ProcessingStatusProps) {
  const [queue, setQueue] = useState<ProcessingQueue>({ jobs: [], totalJobs: 0, completedJobs: 0, failedJobs: 0 });
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    // Subscribe to queue updates
    const unsubscribe = processingService.subscribe(setQueue);
    
    // Get initial state
    setQueue(processingService.getQueue());
    
    return unsubscribe;
  }, []);

  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getStatusIcon = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'queued':
        return (
          <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
        );
      case 'processing':
        return (
          <div className="w-4 h-4 bg-blue-500 rounded-full">
            <div className="w-full h-full bg-blue-400 rounded-full animate-ping"></div>
          </div>
        );
      case 'completed':
        return (
          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
    }
  };

  const getStatusText = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'queued': return 'Queued';
      case 'processing': return 'Processing';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
    }
  };

  const getStatusColor = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'queued': return 'text-yellow-400';
      case 'processing': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
    }
  };

  const handleRetry = (jobId: string) => {
    processingService.retryJob(jobId);
  };

  const handleCancel = (jobId: string) => {
    processingService.cancelJob(jobId);
  };

  const handleClearCompleted = () => {
    processingService.clearCompleted();
  };

  if (queue.jobs.length === 0) {
    return null;
  }

  const activeJobs = queue.jobs.filter(job => job.status === 'processing' || job.status === 'queued');
  const completedJobs = queue.jobs.filter(job => job.status === 'completed');
  const failedJobs = queue.jobs.filter(job => job.status === 'failed');

  return (
    <div className={className}>
      <LiquidGlassCard className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-xl font-semibold text-white">Processing Queue</h3>
              {queue.activeJob && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-400">Active</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {completedJobs.length > 0 && (
                <button
                  onClick={handleClearCompleted}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Clear Completed
                </button>
              )}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg 
                  className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Queue Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{queue.totalJobs}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{activeJobs.length}</div>
              <div className="text-xs text-gray-400">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{queue.completedJobs}</div>
              <div className="text-xs text-gray-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{queue.failedJobs}</div>
              <div className="text-xs text-gray-400">Failed</div>
            </div>
          </div>

          {/* Job List */}
          {isExpanded && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {/* Active/Processing Jobs */}
              {activeJobs.map((job) => (
                <div key={job.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getStatusIcon(job.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-white truncate">
                            {job.videoFile.name}
                          </h4>
                          <span className={`text-xs ${getStatusColor(job.status)}`}>
                            {getStatusText(job.status)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-1">
                          {job.prompt}
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatFileSize(job.videoFile.size)} • {job.createdAt.toLocaleTimeString()}
                        </div>
                        
                        {/* Progress Bar */}
                        {job.status === 'processing' && (
                          <div className="mt-3 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Progress: {Math.round(job.progress)}%</span>
                              {job.estimatedTimeRemaining && (
                                <span className="text-gray-400">
                                  ~{formatTimeRemaining(job.estimatedTimeRemaining)} remaining
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-3">
                      {job.status === 'queued' && (
                        <button
                          onClick={() => handleCancel(job.id)}
                          className="text-xs px-2 py-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Failed Jobs */}
              {failedJobs.map((job) => (
                <div key={job.id} className="p-4 bg-red-500/5 rounded-xl border border-red-500/20">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getStatusIcon(job.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-white truncate">
                            {job.videoFile.name}
                          </h4>
                          <span className={`text-xs ${getStatusColor(job.status)}`}>
                            {getStatusText(job.status)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-1">
                          {job.prompt}
                        </p>
                        {job.error && (
                          <p className="text-xs text-red-400 mt-1">
                            Error: {job.error}
                          </p>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {formatFileSize(job.videoFile.size)} • Failed at {job.completedAt?.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Retry Button */}
                    <div className="flex items-center space-x-2 ml-3">
                      <GradientButton
                        onClick={() => handleRetry(job.id)}
                        size="sm"
                        variant="secondary"
                      >
                        Retry
                      </GradientButton>
                    </div>
                  </div>
                </div>
              ))}

              {/* Completed Jobs (collapsed view) */}
              {completedJobs.length > 0 && (
                <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-green-400">
                        {completedJobs.length} job{completedJobs.length !== 1 ? 's' : ''} completed
                      </span>
                    </div>
                    <button
                      onClick={handleClearCompleted}
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </LiquidGlassCard>
    </div>
  );
}