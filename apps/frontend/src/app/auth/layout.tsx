'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAuthenticated, isConfirmed, isLoading } = useAuth();
  const router = useRouter();
  const isUnconfirmedPage = pathname === '/auth/unconfirmed';

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (!isConfirmed && !isUnconfirmedPage) {
        // Redirect unconfirmed users to unconfirmed page (except if already there)
        router.push('/auth/unconfirmed');
      } else if (isConfirmed && (pathname === '/auth/login' || pathname === '/auth/register')) {
        // Redirect confirmed users away from login/register pages
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isConfirmed, isLoading, pathname, isUnconfirmedPage, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="liquid-glass p-8 rounded-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}