'use client';

import { useState } from 'react';
import { ErrorBanner, ErrorCard, InlineError, useErrorState } from './error-banner';
import { GradientButton } from '@repo/ui/gradient-button';

export function ErrorBannerDemo() {
  const { error, isRetryable, showError, clearError } = useErrorState();
  const [inlineError, setInlineError] = useState<string | null>(null);

  const triggerError = (type: 'network' | 'validation' | 'server') => {
    switch (type) {
      case 'network':
        showError('Network connection failed. Please check your internet connection and try again.', true);
        break;
      case 'validation':
        setInlineError('Please enter a valid email address');
        break;
      case 'server':
        showError('Internal server error occurred. Our team has been notified.', false);
        break;
    }
  };

  return (
    <div className="p-8 space-y-8 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-8">Error Banner Demo</h1>
      
      {/* Trigger buttons */}
      <div className="flex flex-wrap gap-4">
        <GradientButton onClick={() => triggerError('network')} size="sm">
          Trigger Network Error (Retryable)
        </GradientButton>
        <GradientButton onClick={() => triggerError('validation')} size="sm" variant="secondary">
          Trigger Validation Error
        </GradientButton>
        <GradientButton onClick={() => triggerError('server')} size="sm" variant="secondary">
          Trigger Server Error
        </GradientButton>
      </div>

      {/* Banner Style - for page-level errors */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Banner Style (Page Level)</h2>
        <div className="max-w-4xl">
          <ErrorBanner
            error={error}
            title="Upload Failed"
            isRetryable={isRetryable}
            onRetry={() => console.log('Retrying...')}
            onDismiss={clearError}
            variant="banner"
            size="md"
          />
        </div>
      </div>

      {/* Card Style - for section errors */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Card Style (Section Level)</h2>
        <div className="max-w-2xl">
          <ErrorCard
            error={error}
            title="Failed to Load Data"
            isRetryable={isRetryable}
            onRetry={() => console.log('Retrying...')}
            onDismiss={clearError}
            size="md"
          />
        </div>
      </div>

      {/* Inline Style - for form validation */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Inline Style (Form Validation)</h2>
        <div className="max-w-md">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {inlineError && (
            <div className="mt-2">
              <InlineError 
                error={inlineError}
                size="sm"
                onDismiss={() => setInlineError(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Different sizes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Different Sizes</h2>
        
        <div className="space-y-3">
          <div className="max-w-md">
            <ErrorCard
              error="Small error message"
              title="Small Error"
              size="sm"
              onDismiss={() => {}}
            />
          </div>
          
          <div className="max-w-lg">
            <ErrorCard
              error="Medium error message with more details about what went wrong"
              title="Medium Error"
              size="md"
              onDismiss={() => {}}
            />
          </div>
          
          <div className="max-w-2xl">
            <ErrorCard
              error="Large error message with comprehensive details about what went wrong and what the user can do to fix it"
              title="Large Error"
              size="lg"
              onDismiss={() => {}}
            />
          </div>
        </div>
      </div>

      {/* Layout examples */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Layout Examples</h2>
        
        {/* Centered layout */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <ErrorCard
              error="Centered error card"
              title="Centered Layout"
              size="sm"
              onDismiss={() => {}}
            />
          </div>
        </div>

        {/* Full width with max width */}
        <div className="w-full max-w-4xl mx-auto">
          <ErrorBanner
            error="Full width banner with max width constraint"
            title="Full Width Layout"
            variant="banner"
            size="md"
            onDismiss={() => {}}
          />
        </div>
      </div>
    </div>
  );
}