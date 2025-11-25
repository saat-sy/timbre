'use client';

import { useState } from 'react';
import { GradientButton } from '@/components/ui';

export interface ErrorBannerProps {
  error: string | null;
  title?: string;
  isRetryable?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'banner' | 'card' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  persistent?: boolean; // Don't show dismiss button
}

export function ErrorBanner({
  error,
  title = 'Error',
  isRetryable = false,
  onRetry,
  onDismiss,
  className = '',
  variant = 'banner',
  size = 'md',
  showIcon = true,
  persistent = false,
}: ErrorBannerProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  if (!error) return null;

  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'banner':
        return 'bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm shadow-lg';
      case 'card':
        return 'bg-red-500/10 border border-red-500/20 rounded-lg shadow-sm';
      case 'inline':
        return 'bg-red-500/5 border-l-4 border-red-500/50 pl-4 rounded-r-lg';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'p-3 text-sm';
      case 'md':
        return 'p-4 text-sm';
      case 'lg':
        return 'p-6 text-base';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-5 h-5';
      case 'lg':
        return 'w-6 h-6';
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'sm':
        return 'sm';
      case 'md':
        return 'sm';
      case 'lg':
        return 'md';
    }
  };

  return (
    <div
      className={`${getVariantStyles()} ${getSizeStyles()} ${className} w-full`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {showIcon && (
            <div
              className={`bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                size === 'sm'
                  ? 'w-5 h-5'
                  : size === 'md'
                    ? 'w-6 h-6'
                    : 'w-8 h-8'
              }`}
            >
              <svg
                className={`text-red-400 ${getIconSize()}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-red-400 font-medium mb-1 break-words">
              {title}
            </h3>
            <p className="text-red-300 leading-relaxed break-words">{error}</p>

            {/* Action buttons */}
            {(isRetryable || onDismiss) && (
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {isRetryable && onRetry && (
                  <GradientButton
                    onClick={handleRetry}
                    size={getButtonSize() as any}
                    variant="secondary"
                    loading={isRetrying}
                    disabled={isRetrying}
                  >
                    Try Again
                  </GradientButton>
                )}

                {!persistent && onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="text-red-400 hover:text-red-300 transition-colors text-sm whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Close button */}
        {!persistent && onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-300 transition-colors p-1 flex-shrink-0"
            aria-label="Close error"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Specialized variants for common use cases
export function ErrorCard(props: Omit<ErrorBannerProps, 'variant'>) {
  return <ErrorBanner {...props} variant="card" />;
}

export function InlineError(props: Omit<ErrorBannerProps, 'variant'>) {
  return <ErrorBanner {...props} variant="inline" showIcon={false} />;
}

// Hook for managing error state
export function useErrorState() {
  const [error, setError] = useState<string | null>(null);
  const [isRetryable, setIsRetryable] = useState(false);

  const showError = (message: string, retryable: boolean = false) => {
    setError(message);
    setIsRetryable(retryable);
  };

  const clearError = () => {
    setError(null);
    setIsRetryable(false);
  };

  return {
    error,
    isRetryable,
    showError,
    clearError,
  };
}
