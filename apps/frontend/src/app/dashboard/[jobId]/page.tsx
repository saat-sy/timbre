'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { withConfirmedAuth } from '../../../lib/auth';
import { DashboardLayout } from '../../../components/dashboard/dashboard-layout';
import { JobProgressPage } from '../../../components/dashboard/job-progress-page';
import { jobService, type JobProgress } from '../../../lib/jobs';

function JobProgressContent() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      router.push('/dashboard');
      return;
    }

    // Initial load
    const loadInitialProgress = async () => {
      try {
        const progress = await jobService.getJobProgress(jobId);
        setJobProgress(progress);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load job progress:', err);
        setError(err instanceof Error ? err.message : 'Failed to load job');
        setLoading(false);
      }
    };

    loadInitialProgress();

    // Start polling for updates
    const handleProgressUpdate = (progress: JobProgress) => {
      setJobProgress(progress);
      setError(null);
    };

    jobService.startPolling(jobId, handleProgressUpdate);

    // Cleanup on unmount
    return () => {
      jobService.stopPolling(jobId);
    };
  }, [jobId, router]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading job progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Job</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!jobProgress) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Job Not Found</h2>
          <p className="text-gray-400 mb-4">The requested job could not be found.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <JobProgressPage jobProgress={jobProgress} />;
}

function JobProgressPageWrapper() {
  return (
    <DashboardLayout>
      <JobProgressContent />
    </DashboardLayout>
  );
}

export default withConfirmedAuth(JobProgressPageWrapper);