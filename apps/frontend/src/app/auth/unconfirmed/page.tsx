'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth';
import { amplifyAuth } from '../../../lib/auth/amplify-auth';
import { LiquidGlassCard } from '@repo/ui/liquid-glass-card';
import { GradientButton } from '@repo/ui/gradient-button';

export default function UnconfirmedPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string>('');

  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setError('');

    try {
      await amplifyAuth.logout();
      await refreshUser();
      router.push('/auth/login');
    } catch (error) {
      setError('Logout failed. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Account Confirmation Pending</h1>
        <p className="text-gray-400">Your account is waiting for confirmation</p>
      </div>

      {/* Status Information */}
      <LiquidGlassCard className="p-8">
        <div className="text-center space-y-6">
          {/* Status Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          {/* Status Message */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">
              Welcome, {user?.email}!
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Your account has been created successfully! Your account is now pending manual confirmation.
              Our team will review and approve your account.
            </p>
          </div>

          {/* Information Section */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-left">
            <h3 className="text-blue-400 font-medium mb-2">What happens next?</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                Account created successfully
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                Our team will review and approve your account
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                You'll receive an email notification once approved
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                After approval, you'll have full access to all features
              </li>
            </ul>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Logout Button */}
          <div className="pt-4">
            <GradientButton
              onClick={handleLogout}
              className="w-full"
              loading={isLoggingOut}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
            </GradientButton>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Footer Links */}
      <div className="text-center space-y-4">
        <p className="text-gray-400">
          Need help?{' '}
          <Link
            href="/"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Contact Support
          </Link>
        </p>

        <p className="text-gray-400">
          <Link
            href="/"
            className="text-gray-300 hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
        </p>
      </div>

      {/* Information Card */}
      <LiquidGlassCard variant="secondary" className="p-4">
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-2">
            <span className="text-green-400">Account:</span> Created ✓ | <span className="text-blue-400">Status:</span> Pending Manual Approval
          </p>
          <p className="text-xs text-gray-500">
            Account approval typically takes 1-2 business days
          </p>
        </div>
      </LiquidGlassCard>
    </div>
  );
}