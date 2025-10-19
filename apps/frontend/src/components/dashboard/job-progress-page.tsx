'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LiquidGlassCard } from '@repo/ui/liquid-glass-card';
import { GradientButton } from '@repo/ui/gradient-button';
import type { JobProgress } from '../../lib/jobs';

interface JobProgressPageProps {
  jobProgress: JobProgress;
}

export function JobProgressPage({ jobProgress }: JobProgressPageProps) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = () => {
    switch (jobProgress.status) {
      case 'SCHEDULED':
        return (
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'PROCESSING':
        return (
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
          </div>
        );
      case 'COMPLETED':
        return (
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'FAILED':
        return (
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getStatusText = () => {
    switch (jobProgress.status) {
      case 'SCHEDULED':
        return 'Scheduled';
      case 'PROCESSING':
        return 'Processing';
      case 'COMPLETED':
        return 'Completed';
      case 'FAILED':
        return 'Failed';
    }
  };

  const getStatusColor = () => {
    switch (jobProgress.status) {
      case 'SCHEDULED':
        return 'text-yellow-400';
      case 'PROCESSING':
        return 'text-blue-400';
      case 'COMPLETED':
        return 'text-green-400';
      case 'FAILED':
        return 'text-red-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="h-full px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
          
          <div className="text-sm text-gray-400">
            Job ID: {jobProgress.jobId}
          </div>
        </div>

        {/* Main Status Card */}
        <LiquidGlassCard className="p-8">
          <div className="text-center space-y-6">
            {/* Status Icon */}
            <div className="flex justify-center">
              {getStatusIcon()}
            </div>

            {/* Status Text */}
            <div>
              <h1 className="text-3xl font-semibold text-white mb-2">
                Job {getStatusText()}
              </h1>
              <p className={`text-lg ${getStatusColor()}`}>
                {jobProgress.status === 'PROCESSING' && 'Your video is being processed...'}
                {jobProgress.status === 'SCHEDULED' && 'Your job is queued for processing...'}
                {jobProgress.status === 'COMPLETED' && 'Your video has been processed successfully!'}
                {jobProgress.status === 'FAILED' && 'Processing failed. Please try again.'}
              </p>
            </div>

            {/* Progress Bar */}
            {(jobProgress.status === 'PROCESSING' || jobProgress.status === 'SCHEDULED') && (
              <div className="w-full max-w-md mx-auto space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Progress</span>
                  <span>{Math.round(jobProgress.progress)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${jobProgress.progress}%` }}
                  />
                </div>
                {jobProgress.estimatedTimeRemaining && (
                  <p className="text-sm text-gray-400">
                    Estimated time remaining: {Math.ceil(jobProgress.estimatedTimeRemaining / 1000 / 60)} minutes
                  </p>
                )}
              </div>
            )}

            {/* Error Message */}
            {jobProgress.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-red-400 text-sm">{jobProgress.error}</p>
              </div>
            )}

            {/* Success Actions */}
            {jobProgress.status === 'COMPLETED' && jobProgress.finalUrl && (
              <div className="space-y-4">
                <GradientButton
                  onClick={() => window.open(jobProgress.finalUrl, '_blank')}
                  size="lg"
                >
                  Download Result
                </GradientButton>
                
                {jobProgress.summary && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 max-w-md mx-auto">
                    <h3 className="text-green-400 font-medium mb-2">Summary</h3>
                    <p className="text-gray-300 text-sm">{jobProgress.summary}</p>
                  </div>
                )}
              </div>
            )}

            {/* Retry Button for Failed Jobs */}
            {jobProgress.status === 'FAILED' && (
              <div className="space-y-4">
                <GradientButton
                  onClick={() => router.push('/dashboard')}
                  size="lg"
                  variant="secondary"
                >
                  Try Again
                </GradientButton>
              </div>
            )}
          </div>
        </LiquidGlassCard>

        {/* Job Details */}
        <LiquidGlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Job Details</h2>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg 
                className={`w-5 h-5 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Status:</span>
              <span className={`ml-2 ${getStatusColor()}`}>{getStatusText()}</span>
            </div>
            <div>
              <span className="text-gray-400">Progress:</span>
              <span className="ml-2 text-white">{Math.round(jobProgress.progress)}%</span>
            </div>
            <div>
              <span className="text-gray-400">Created:</span>
              <span className="ml-2 text-white">{formatDate(jobProgress.createdAt)}</span>
            </div>
            <div>
              <span className="text-gray-400">Updated:</span>
              <span className="ml-2 text-white">{formatDate(jobProgress.updatedAt)}</span>
            </div>
          </div>

          {showDetails && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400 block mb-1">Job ID:</span>
                  <code className="text-white bg-white/5 px-2 py-1 rounded text-xs">
                    {jobProgress.jobId}
                  </code>
                </div>
                
                {jobProgress.finalUrl && (
                  <div>
                    <span className="text-gray-400 block mb-1">Result URL:</span>
                    <a
                      href={jobProgress.finalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors break-all"
                    >
                      {jobProgress.finalUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </LiquidGlassCard>

        {/* Auto-refresh Notice */}
        {(jobProgress.status === 'PROCESSING' || jobProgress.status === 'SCHEDULED') && (
          <div className="text-center">
            <p className="text-sm text-gray-400">
              This page will automatically update every 5 seconds
            </p>
          </div>
        )}
      </div>
    </div>
  );
}