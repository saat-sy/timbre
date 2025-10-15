'use client';

import { withConfirmedAuth } from '../../../lib/auth';
import { DashboardLayout } from '../../../components/dashboard/dashboard-layout';
import { HistoryManager } from '../../../components/dashboard/history-manager';

function HistoryPage() {
  return (
    <DashboardLayout>
      <div className="px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-white">Job History</h1>
            <p className="text-gray-400 text-lg">
              Manage and review all your music generation projects
            </p>
          </div>

          {/* History Manager */}
          <HistoryManager />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withConfirmedAuth(HistoryPage);