'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, amplifyAuth, validateEmail, validatePassword, AuthError } from '../../../lib/auth';
import { LiquidGlassCard } from '@repo/ui/liquid-glass-card';
import { GradientButton } from '@repo/ui/gradient-button';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { refreshUser } = useAuth();
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await amplifyAuth.login(formData.email, formData.password);
      await refreshUser(); // Refresh user state after login
      router.push('/dashboard');
    } catch (error) {
      if (error instanceof AuthError) {
        setErrors({
          general: error.message,
        });
      } else {
        setErrors({
          general: 'Login failed. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
        <p className="text-gray-400">Sign in to your Timbre account</p>
      </div>

      {/* Login Form */}
      <LiquidGlassCard className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {errors.general}
            </div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg bg-white/5 border ${
                errors.email ? 'border-red-500/50' : 'border-white/10'
              } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all`}
              placeholder="your@email.com"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg bg-white/5 border ${
                errors.password ? 'border-red-500/50' : 'border-white/10'
              } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all`}
              placeholder="Your password"
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-400">{errors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <GradientButton
            type="submit"
            className="w-full"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </GradientButton>
        </form>
      </LiquidGlassCard>

      {/* Footer Links */}
      <div className="text-center space-y-4">
        <p className="text-gray-400">
          Don't have an account?{' '}
          <Link 
            href="/auth/register" 
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Sign up
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
    </div>
  );
}