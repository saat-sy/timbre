'use client';

import { withConfirmedAuth } from '../../lib/auth';
import { DashboardLayout } from '../../components/dashboard/dashboard-layout';
import { useDashboard } from '../../components/dashboard/dashboard-context';
import { UploadPage } from '../../components/dashboard/upload-page';
import { HistoryPage } from '../../components/dashboard/history-page';
import { SettingsPage } from '../../components/dashboard/settings-page';
import { AccountPage } from '../../components/dashboard/account-page';

function DashboardContent() {
  const { activePage } = useDashboard();

  const renderPage = () => {
    switch (activePage) {
      case 'upload':
        return <UploadPage />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
      case 'account':
        return <AccountPage />;
      default:
        return <UploadPage />;
    }
  };

  return renderPage();
}

function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}

export default withConfirmedAuth(DashboardPage);