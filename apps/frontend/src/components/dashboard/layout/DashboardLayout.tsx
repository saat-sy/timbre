'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardProvider } from '../context';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <DashboardProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        {/* Top Bar */}
        <Sidebar />

        {/* Main Content */}
        <main className="pt-16">{children}</main>
      </div>
    </DashboardProvider>
  );
}
