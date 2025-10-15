'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context';

export const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  const AuthenticatedComponent = (props: P) => {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/auth/login');
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="liquid-glass p-8 rounded-2xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;

  return AuthenticatedComponent;
};

export const withConfirmedAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  const ConfirmedAuthenticatedComponent = (props: P) => {
    const { isAuthenticated, isConfirmed, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          router.push('/auth/login');
        } else if (!isConfirmed) {
          router.push('/auth/unconfirmed');
        }
      }
    }, [isAuthenticated, isConfirmed, isLoading, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="liquid-glass p-8 rounded-2xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      );
    }

    if (!isAuthenticated || !isConfirmed) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  ConfirmedAuthenticatedComponent.displayName = `withConfirmedAuth(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ConfirmedAuthenticatedComponent;
};

export const useRedirectIfAuthenticated = (redirectTo: string = '/dashboard') => {
  const { isAuthenticated, isConfirmed, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (!isConfirmed) {
        router.push('/auth/unconfirmed');
      } else {
        router.push(redirectTo);
      }
    }
  }, [isAuthenticated, isConfirmed, isLoading, router, redirectTo]);

  return { isLoading, isAuthenticated, isConfirmed };
};

export const useRedirectUnconfirmed = () => {
  const { isAuthenticated, isConfirmed, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isConfirmed) {
      router.push('/auth/unconfirmed');
    }
  }, [isAuthenticated, isConfirmed, isLoading, router]);
};