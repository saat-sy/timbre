"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LiquidGlassCard } from "@repo/ui/liquid-glass-card";
import { GradientButton } from "@repo/ui/gradient-button";
import { jobService, type JobProgress } from "../../lib/jobs";
import { useErrorHandler } from "../../lib/utils/error-handler";
import { ErrorCard, useErrorState } from "../ui/error-banner";

interface HistoryManagerProps {
  className?: string;
}

export function HistoryManager({ className }: HistoryManagerProps) {
  const router = useRouter();
  const [allJobs, setAllJobs] = useState<JobProgress[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { error, isRetryable, showError, clearError } = useErrorState();
  const { handleError, isRetryable: checkRetryable } = useErrorHandler();

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);
        const jobs = await jobService.getUserJobs();
        setAllJobs(jobs);
        clearError();
      } catch (err) {
        const errorMessage = handleError(err, 'loading user jobs');
        const canRetry = checkRetryable(err);
        showError(errorMessage, canRetry);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, []);

  const filteredJobs = allJobs
    .filter(job => {
      // Filter by status
      if (filter === 'completed' && job.status !== 'COMPLETED') return false;
      if (filter === 'failed' && job.status !== 'FAILED') return false;

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          job.jobId.toLowerCase().includes(searchLower)
        );
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const getStatusBadge = (status: JobProgress['status']) => {
    const styles = {
      SCHEDULED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      PROCESSING: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      ANALYZED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      AUDIO_GENERATED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      PROCESSED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/30',
      FAILED: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    const labels = {
      SCHEDULED: 'Scheduled',
      PROCESSING: 'Processing',
      ANALYZED: 'Analyzed',
      AUDIO_GENERATED: 'Audio Generated',
      PROCESSED: 'Processed',
      COMPLETED: 'Completed',
      FAILED: 'Failed',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const handleViewJob = (jobId: string) => {
    router.push(`/dashboard/${jobId}`);
  };

  const handleRetry = (jobId: string) => {
    // Navigate to the job page for retry
    router.push(`/dashboard/${jobId}`);
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const jobs = await jobService.getUserJobs();
      setAllJobs(jobs);
      clearError();
    } catch (err) {
      const errorMessage = handleError(err, 'refreshing user jobs');
      const canRetry = checkRetryable(err);
      showError(errorMessage, canRetry);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: allJobs.length,
    completed: allJobs.filter(job => job.status === 'COMPLETED').length,
    failed: allJobs.filter(job => job.status === 'FAILED').length,
    processing: allJobs.filter(job => 
      job.status === 'SCHEDULED' || 
      job.status === 'PROCESSING' || 
      job.status === 'ANALYZED' || 
      job.status === 'AUDIO_GENERATED' || 
      job.status === 'PROCESSED'
    ).length,
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
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
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
                placeholder="Search by job ID..."
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
              <option value="status">Sort by Status</option>
            </select>
          </div>

          {/* Job List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading jobs...</p>
            </div>
          ) : error ? (
            <div className="py-6">
              <div className="max-w-2xl mx-auto">
                <ErrorCard
                  error={error}
                  title="Error loading jobs"
                  isRetryable={isRetryable}
                  onRetry={handleRefresh}
                  onDismiss={clearError}
                  size="md"
                />
              </div>
            </div>
          ) : filteredJobs.length === 0 ? (
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
                <div
                  key={job.jobId}
                  className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer"
                  onClick={() => handleViewJob(job.jobId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-sm font-medium text-white truncate">
                          Job {job.jobId.slice(0, 8)}...
                        </h4>
                        {getStatusBadge(job.status)}
                      </div>

                      {job.summary && (
                        <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                          {job.summary}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                        <span>{new Date(job.createdAt).toLocaleTimeString()}</span>
                        {(job.status !== 'COMPLETED' && job.status !== 'FAILED') && (
                          <span className="text-blue-400">{Math.round(job.progress)}%</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      {job.status === 'FAILED' && (
                        <GradientButton
                          onClick={() => handleRetry(job.jobId)}
                          size="sm"
                          variant="secondary"
                        >
                          Retry
                        </GradientButton>
                      )}
                      {job.status === 'COMPLETED' && job.finalUrl && (
                        <GradientButton
                          onClick={() => window.open(job.finalUrl, '_blank')}
                          size="sm"
                          variant="primary"
                        >
                          Download
                        </GradientButton>
                      )}
                      <GradientButton
                        onClick={() => handleViewJob(job.jobId)}
                        size="sm"
                        variant="secondary"
                      >
                        View
                      </GradientButton>
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