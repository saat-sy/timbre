'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { withAuth } from '../../lib/auth-middleware';
import { DashboardLayout } from '../../components/dashboard/dashboard-layout';
import { VideoUploadInterface } from '../../components/dashboard/video-upload-interface';
import { ProcessingStatus } from '../../components/dashboard/processing-status';
import { ResultsDisplay } from '../../components/dashboard/results-display';
import { processingService } from '../../lib/processing-service';
import { LiquidGlassCard } from '@repo/ui/liquid-glass-card';

function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalJobs: 0, completedJobs: 0, todayJobs: 0 });

  useEffect(() => {
    // Update stats when queue changes
    const unsubscribe = processingService.subscribe(() => {
      const processingStats = processingService.getStats();
      setStats({
        totalJobs: processingStats.totalJobs,
        completedJobs: processingStats.completedJobs,
        todayJobs: processingStats.todayJobs,
      });
    });

    // Get initial stats
    const initialStats = processingService.getStats();
    setStats({
      totalJobs: initialStats.totalJobs,
      completedJobs: initialStats.completedJobs,
      todayJobs: initialStats.todayJobs,
    });

    return unsubscribe;
  }, []);

  return (
    <DashboardLayout>
      <div className="px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Welcome Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-white">
              Welcome back, {user?.name || user?.email?.split('@')[0]}!
            </h1>
            <p className="text-gray-400 text-lg">
              Ready to create some amazing music?
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <LiquidGlassCard className="p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">{stats.totalJobs}</div>
              <div className="text-gray-400">Total Jobs</div>
            </LiquidGlassCard>
            <LiquidGlassCard className="p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">{stats.completedJobs}</div>
              <div className="text-gray-400">Completed</div>
            </LiquidGlassCard>
            <LiquidGlassCard className="p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">{stats.todayJobs}</div>
              <div className="text-gray-400">Today</div>
            </LiquidGlassCard>
          </div>

          {/* Processing Status */}
          <ProcessingStatus />

          {/* Video Upload Interface */}
          <VideoUploadInterface 
            onSubmit={(file, prompt) => {
              // Add job to processing queue
              processingService.addJob(file, prompt);
            }}
          />

          {/* Results Display */}
          <ResultsDisplay />

          {/* Account Information */}
          <LiquidGlassCard className="p-6">
            <h3 className="text-lg font-medium text-white mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Email:</span>
                <span className="text-white ml-2">{user?.email}</span>
              </div>
              <div>
                <span className="text-gray-400">User ID:</span>
                <span className="text-white ml-2">{user?.id}</span>
              </div>
              <div>
                <span className="text-gray-400">Member since:</span>
                <span className="text-white ml-2">{user?.createdAt?.toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-gray-400">Plan:</span>
                <span className="text-white ml-2">Free</span>
              </div>
            </div>
          </LiquidGlassCard>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(DashboardPage);