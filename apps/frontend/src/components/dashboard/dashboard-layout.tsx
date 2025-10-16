"use client";

import { ReactNode } from "react";
import { DashboardNavigation } from "./dashboard-navigation";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Navigation */}
      <DashboardNavigation />
      
      {/* Main Content */}
      <main className="pt-20 pb-8">
        {children}
      </main>
    </div>
  );
}