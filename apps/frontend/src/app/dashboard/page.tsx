'use client';

import { withConfirmedAuth } from '../../lib/auth';
import {
  DashboardLayout,
  useDashboard,
  UploadPage,
  SettingsPage,
  AccountPage,
} from '../../components/dashboard';

function DashboardContent() {
  const { activePage } = useDashboard();

  const renderPage = () => {
    switch (activePage) {
      case 'upload':
        return <UploadPage />;
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