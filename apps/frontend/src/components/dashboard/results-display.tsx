"use client";

import { useState, useEffect } from "react";
import { LiquidGlassCard } from "@repo/ui/liquid-glass-card";
import { GradientButton } from "@repo/ui/gradient-button";
import { processingService } from "../../lib/processing-service";
import { ProcessingJob } from "../../lib/processing-types";

interface ResultsDisplayProps {
  className?: string;
}

export function ResultsDisplay({ className }: ResultsDisplayProps) {
  const [completedJobs, setCompletedJobs] = useState<ProcessingJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<ProcessingJob | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  useEffect(() => {
    // Subscribe to queue updates to get completed jobs
    const unsubscribe = processingService.subscribe((queue) => {
      const completed = queue.jobs.filter(job => job.status === 'completed');
      setCompletedJobs(completed.reverse()); // Show newest first
    });

    // Get initial completed jobs
    const initialQueue = processingService.getQueue();
    const completed = initialQueue.jobs.filter(job => job.status === 'completed');
    setCompletedJobs(completed.reverse());

    return unsubscribe;
  }, []);

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatProcessingTime = (job: ProcessingJob): string => {
    if (!job.startedAt || !job.completedAt) return 'Unknown';
    const duration = job.completedAt.getTime() - job.startedAt.getTime();
    const seconds = Math.round(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleDownload = (job: ProcessingJob, type: 'video' | 'audio') => {
    // Simulate download - in a real app, this would trigger actual file download
    const filename = type === 'video' 
      ? `${job.videoFile.name.replace(/\.[^/.]+$/, '')}_with_music.mp4`
      : `${job.videoFile.name.replace(/\.[^/.]+$/, '')}_soundtrack.mp3`;
    
    console.log(`Downloading ${type}:`, filename);
    
    // Create a mock download link
    const link = document.createElement('a');
    link.href = job.resultUrl || '#';
    link.download = filename;
    link.click();
  };

  const handlePlayVideo = (job: ProcessingJob) => {
    setSelectedJob(job);
    setIsVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setSelectedJob(null);
  };

  if (completedJobs.length === 0) {
    return (
      <div className={className}>
        <LiquidGlassCard className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">No Results Yet</h3>
              <p className="text-gray-400">
                Your completed music generation results will appear here. Upload a video to get started!
              </p>
            </div>
          </div>
        </LiquidGlassCard>
      </div>
    );
  }

  return (
    <div className={className}>
      <LiquidGlassCard className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Your Results</h3>
            <div className="text-sm text-gray-400">
              {completedJobs.length} completed project{completedJobs.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {completedJobs.map((job) => (
              <div key={job.id} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300">
                <div className="space-y-4">
                  {/* Video Thumbnail/Preview */}
                  <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden group cursor-pointer"
                       onClick={() => handlePlayVideo(job)}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/20 transition-all duration-300">
                        <svg className="w-8 h-8 text-white ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-xs text-white">
                      {formatFileSize(job.videoFile.size)}
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/80 backdrop-blur-sm rounded text-xs text-white">
                      Completed
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Job Info */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-white truncate">
                        {job.videoFile.name}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                        {job.prompt}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                      <div>
                        <span className="block text-gray-500">Completed</span>
                        <span>{job.completedAt?.toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="block text-gray-500">Processing Time</span>
                        <span>{formatProcessingTime(job)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <GradientButton
                        onClick={() => handlePlayVideo(job)}
                        size="sm"
                        variant="primary"
                        className="flex-1"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                        </svg>
                        Play
                      </GradientButton>
                      <button
                        onClick={() => handleDownload(job, 'video')}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 text-sm"
                        title="Download Video with Music"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDownload(job, 'audio')}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 text-sm"
                        title="Download Audio Only"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </LiquidGlassCard>

      {/* Video Modal */}
      {isVideoModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl">
            <LiquidGlassCard className="p-6">
              <div className="space-y-4">
                {/* Modal Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {selectedJob.videoFile.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Generated with: "{selectedJob.prompt}"
                    </p>
                  </div>
                  <button
                    onClick={closeVideoModal}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Video Player Placeholder */}
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium">Video Player</p>
                      <p className="text-gray-400 text-sm">
                        In a real implementation, this would show the processed video with generated music
                      </p>
                    </div>
                  </div>
                </div>

                {/* Download Actions */}
                <div className="flex space-x-4">
                  <GradientButton
                    onClick={() => handleDownload(selectedJob, 'video')}
                    className="flex-1"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Video with Music
                  </GradientButton>
                  <GradientButton
                    onClick={() => handleDownload(selectedJob, 'audio')}
                    variant="secondary"
                    className="flex-1"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    Download Audio Only
                  </GradientButton>
                </div>

                {/* Job Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-sm">
                  <div>
                    <span className="block text-gray-400">File Size</span>
                    <span className="text-white">{formatFileSize(selectedJob.videoFile.size)}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400">Processing Time</span>
                    <span className="text-white">{formatProcessingTime(selectedJob)}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400">Completed</span>
                    <span className="text-white">{selectedJob.completedAt?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400">Job ID</span>
                    <span className="text-white font-mono text-xs">{selectedJob.id.slice(-8)}</span>
                  </div>
                </div>
              </div>
            </LiquidGlassCard>
          </div>
        </div>
      )}
    </div>
  );
}