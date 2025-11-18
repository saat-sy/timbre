"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { DashboardProvider } from "../context";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <DashboardProvider>
      <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <main className="h-full pl-16 overflow-auto">
          {children}
        </main>
      </div>
    </DashboardProvider>
  );
}