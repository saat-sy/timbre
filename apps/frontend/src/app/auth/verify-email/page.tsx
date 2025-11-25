'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { useAuth } from '../../../lib/auth';
import { LiquidGlassCard } from '@/components/ui';
import { GradientButton } from '@/components/ui';

export default function VerifyEmailPage() {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  const { refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailParam = searchParams.get('email');
    const storedEmail = localStorage.getItem('pendingVerificationEmail');

    if (emailParam) {
      setEmail(emailParam);
      localStorage.setItem('pendingVerificationEmail', emailParam);
    } else if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // If no email found, redirect to login
      router.push('/auth/login');
    }
  }, [searchParams, router]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (!email) {
      setError('Email address not found. Please try signing up again.');
      return;
    }

    setIsVerifying(true);
    setError('');
    setSuccess('');

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: verificationCode.trim(),
      });

      setSuccess('Email verified successfully! Redirecting to login...');

      // Clear stored email
      localStorage.removeItem('pendingVerificationEmail');

      // Redirect to login page with verification success flag
      setTimeout(() => {
        router.push('/auth/login?verified=true');
      }, 2000);
    } catch (error: any) {
      console.error('Email verification error:', error);

      switch (error.name) {
        case 'CodeMismatchException':
          setError('Invalid verification code. Please check and try again.');
          break;
        case 'ExpiredCodeException':
          setError('Verification code has expired. Please request a new one.');
          break;
        case 'UserNotFoundException':
          setError('User not found. Please try signing up again.');
          break;
        case 'NotAuthorizedException':
          setError('Invalid verification code or user already confirmed.');
          break;
        default:
          setError(error.message || 'Verification failed. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setError('Email address not found. Please try signing up again.');
      return;
    }

    setIsResending(true);
    setError('');
    setSuccess('');

    try {
      await resendSignUpCode({
        username: email,
      });

      setSuccess('Verification code sent! Check your email.');
    } catch (error: any) {
      console.error('Resend code error:', error);

      switch (error.name) {
        case 'UserNotFoundException':
          setError('User not found. Please try signing up again.');
          break;
        case 'InvalidParameterException':
          setError('Invalid email address.');
          break;
        case 'TooManyRequestsException':
          setError(
            'Too many requests. Please wait before requesting another code.'
          );
          break;
        default:
          setError(error.message || 'Failed to resend code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Verify Your Email
        </h1>
        <p className="text-gray-400">
          We've sent a verification code to{' '}
          <span className="text-white font-medium">{email}</span>
        </p>
      </div>

      {/* Verification Form */}
      <LiquidGlassCard className="p-8">
        <form onSubmit={handleVerifyCode} className="space-y-6">
          {/* Verification Code Input */}
          <div>
            <label
              htmlFor="verificationCode"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Verification Code
            </label>
            <input
              id="verificationCode"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={6}
              autoComplete="one-time-code"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* Verify Button */}
          <GradientButton
            type="submit"
            className="w-full"
            loading={isVerifying}
            disabled={isVerifying || !verificationCode.trim()}
          >
            {isVerifying ? 'Verifying...' : 'Verify Email'}
          </GradientButton>
        </form>

        {/* Resend Code */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="text-center space-y-4">
            <p className="text-gray-400 text-sm">Didn't receive the code?</p>
            <button
              onClick={handleResendCode}
              disabled={isResending}
              className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? 'Sending...' : 'Resend verification code'}
            </button>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Instructions */}
      <LiquidGlassCard variant="secondary" className="p-6">
        <div className="space-y-4">
          <h3 className="text-white font-medium">
            Email Verification - Step 1 of 2
          </h3>
          <div className="text-gray-300 text-sm space-y-2">
            <p>• Look for an email from Timbre with your verification code</p>
            <p>• The code is 6 digits long</p>
            <p>• Check your spam folder if you don't see it</p>
            <p>• The code expires after 24 hours</p>
            <p className="text-blue-400">
              • After verification, your account will await manual approval
            </p>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Footer Links */}
      <div className="text-center space-y-4">
        <p className="text-gray-400">
          Wrong email address?{' '}
          <Link
            href="/auth/register"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Sign up again
          </Link>
        </p>

        <p className="text-gray-400">
          <Link
            href="/auth/login"
            className="text-gray-300 hover:text-white transition-colors"
          >
            ← Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
