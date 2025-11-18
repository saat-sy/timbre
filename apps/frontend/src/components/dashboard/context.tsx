'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type DashboardPage = 'upload' | 'settings' | 'account';

interface DashboardContextType {
  activePage: DashboardPage;
  setActivePage: (page: DashboardPage) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [activePage, setActivePage] = useState<DashboardPage>('upload');

  return (
    <DashboardContext.Provider value={{ activePage, setActivePage }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}