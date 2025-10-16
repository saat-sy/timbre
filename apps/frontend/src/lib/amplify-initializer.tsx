'use client';

import { useEffect, useState } from 'react';
import { configureAmplify } from './auth/amplify-config';

interface AmplifyInitializerProps {
  children: React.ReactNode;
}

interface InitializationState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

export function AmplifyInitializer({ children }: AmplifyInitializerProps) {
  const [state, setState] = useState<InitializationState>({
    isInitialized: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const initializeAmplify = async () => {
      try {
        // Add timeout for initialization
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Amplify initialization timeout after 5 seconds')), 5000);
        });

        await Promise.race([
          Promise.resolve(configureAmplify()),
          timeoutPromise
        ]);

        setState({
          isInitialized: true,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Failed to initialize AWS Amplify:', error);

        const errorMessage = error instanceof Error
          ? error.message
          : 'Unknown error occurred during Amplify initialization';

        setState({
          isInitialized: false,
          isLoading: false,
          error: errorMessage,
        });
      }
    };

    initializeAmplify();
  }, []);

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Initializing application...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Configuration Error</h2>
          <p className="text-gray-300 mb-4">{state.error}</p>
          <p className="text-sm text-gray-400">
            Please check your environment configuration and refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}