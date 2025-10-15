"use client";

import { useState, useEffect } from "react";
import { LiquidGlassCard } from "@repo/ui/liquid-glass-card";
import { GradientButton } from "@repo/ui/gradient-button";
import { processingService } from "../../lib/processing-service";
import { ProcessingJob } from "../../lib/processing-types";

interface HistoryManagerProps {
  className?: string;
}

export function HistoryManager({ className }: HistoryManagerProps) {
  const [allJobs, setAllJobs] = useState<ProcessingJob[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Subscribe to queue updates
    const unsubscribe = processingService.subscribe((queue) => {
      setAllJobs([...queue.jobs].reverse()); // Show newest first
    });

    // Get initial jobs
    const initialQueue = processingService.getQueue();
    setAllJobs([...initialQueue.jobs].reverse());

    return unsubscribe;
  }, []);

  const filteredJobs = allJobs
    .filter(job => {
      // Filter by status
      if (filter === 'completed' && job.status !== 'completed') return false;
      if (filter === 'failed' && job.status !== 'failed') return false;
      
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          job.videoFile.name.toLowerCase().includes(searchLower) ||
          job.prompt.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.videoFile.name.localeCompare(b.videoFile.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

  const getStatusBadge = (status: ProcessingJob['status']) => {
    const styles = {
      queued: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleRetry = (jobId: string) => {
    processingService.retryJob(jobId);
  };

  const handleDelete = (jobId: string) => {
    // In a real app, this would delete the job from storage
    console.log('Delete job:', jobId);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all completed jobs?')) {
      processingService.clearCompleted();
    }
  };

  const stats = {
    total: allJobs.length,
    completed: allJobs.filter(job => job.status === 'completed').length,
    failed: allJobs.filter(job => job.status === 'failed').length,
    processing: allJobs.filter(job => job.status === 'processing' || job.status === 'queued').length,
  };

  return (
    <div className={className}>
      <LiquidGlassCard className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Job History</h3>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-400">
                {filteredJobs.length} of {allJobs.length} jobs
              </div>
              {stats.completed > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Clear Completed
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-lg font-bold text-white">{stats.total}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-lg font-bold text-blue-400">{stats.processing}</div>
              <div className="text-xs text-gray-400">Active</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-lg font-bold text-green-400">{stats.completed}</div>
              <div className="text-xs text-gray-400">Completed</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-lg font-bold text-red-400">{stats.failed}</div>
              <div className="text-xs text-gray-400">Failed</div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by filename or prompt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Jobs</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>

          {/* Job List */}
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-gray-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-400">
                {searchTerm ? 'No jobs match your search' : 'No jobs found'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredJobs.map((job) => (
                <div key={job.id} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-sm font-medium text-white truncate">
                          {job.videoFile.name}
                        </h4>
                        {getStatusBadge(job.status)}
                      </div>
                      
                      <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                        {job.prompt}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{formatFileSize(job.videoFile.size)}</span>
                        <span>{job.createdAt.toLocaleDateString()}</span>
                        <span>{job.createdAt.toLocaleTimeString()}</span>
                        {job.status === 'processing' && (
                          <span className="text-blue-400">{Math.round(job.progress)}%</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {job.status === 'failed' && (
                        <GradientButton
                          onClick={() => handleRetry(job.id)}
                          size="sm"
                          variant="secondary"
                        >
                          Retry
                        </GradientButton>
                      )}
                      {job.status === 'completed' && (
                        <GradientButton
                          onClick={() => console.log('View result:', job.id)}
                          size="sm"
                          variant="primary"
                        >
                          View
                        </GradientButton>
                      )}
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors p-1"
                        title="Delete job"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </LiquidGlassCard>
    </div>
  );
}