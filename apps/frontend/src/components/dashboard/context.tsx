'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export type DashboardPage = 'upload' | 'settings' | 'account';

interface DashboardContextType {
  activePage: DashboardPage;
  setActivePage: (page: DashboardPage) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activePage, setActivePageState] = useState<DashboardPage>('upload');

  // Initialize from URL
  useEffect(() => {
    const page = searchParams.get('page');
    if (page && ['upload', 'settings', 'account'].includes(page)) {
      setActivePageState(page as DashboardPage);
    }
  }, [searchParams]);

  const setActivePage = (page: DashboardPage) => {
    setActivePageState(page);
    // Update URL without full reload
    const params = new URLSearchParams(searchParams.toString());
    if (page === 'upload') {
      params.delete('page');
    } else {
      params.set('page', page);
    }
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`);
  };

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
