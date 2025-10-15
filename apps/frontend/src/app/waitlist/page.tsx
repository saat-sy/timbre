"use client";

import { useState } from "react";
import { LiquidGlassCard } from "@repo/ui/liquid-glass-card";
import { GradientButton } from "@repo/ui/gradient-button";
import Link from "next/link";
import { submitToWaitlist, validateEmail, prepareWaitlistData } from "../../lib/waitlist";

interface FormData {
  email: string;
  additionalInfo: string;
}

interface FormErrors {
  email?: string;
  general?: string;
}

export default function WaitlistPage() {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    additionalInfo: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);



  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear errors when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({});
    
    // Validate form
    const newErrors: FormErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const preparedData = prepareWaitlistData(formData);
      const result = await submitToWaitlist(preparedData);
      
      if (!result.success) {
        if (result.error === "This email is already on the waitlist") {
          setErrors({ email: result.error });
        } else {
          setErrors({ general: result.message });
        }
        return;
      }
      
      setIsSubmitted(true);
    } catch (error) {
      setErrors({ general: "Network error. Please check your connection and try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <LiquidGlassCard variant="primary" className="p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">You're on the list!</h1>
              <p className="text-gray-300">
                Thanks for joining our waitlist. We'll notify you as soon as Timbre is ready for you to try.
              </p>
            </div>
            
            <div className="space-y-4">
              <Link href="/">
                <GradientButton variant="primary" className="w-full">
                  Back to Home
                </GradientButton>
              </Link>
              <Link href="/login">
                <GradientButton variant="ghost" className="w-full">
                  Already have access? Sign In
                </GradientButton>
              </Link>
            </div>
          </LiquidGlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse animation-delay-200" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <h1 className="text-3xl font-bold gradient-text hover:scale-105 transition-transform">
              Timbre
            </h1>
          </Link>
          <h2 className="text-2xl font-bold text-white mb-2">Join the Waitlist</h2>
          <p className="text-gray-300">
            Be the first to know when Timbre launches and get early access to AI-powered music generation.
          </p>
        </div>

        {/* Waitlist Form */}
        <LiquidGlassCard variant="primary" className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-400 
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  transition-all duration-200 backdrop-blur-sm ${
                    errors.email 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-white/20 hover:border-white/30'
                  }`}
                placeholder="your@email.com"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-400 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Additional Info Field */}
            <div>
              <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-300 mb-2">
                Tell us about your use case (optional)
              </label>
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                value={formData.additionalInfo}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  transition-all duration-200 backdrop-blur-sm hover:border-white/30 resize-none"
                placeholder="What kind of videos do you create? How would you use Timbre?"
                disabled={isSubmitting}
              />
            </div>

            {/* General Error */}
            {errors.general && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-400 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.general}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <GradientButton
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Joining Waitlist..." : "Join Waitlist"}
            </GradientButton>
          </form>

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center space-y-2">
            <p className="text-sm text-gray-400">
              Already have access?{" "}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Sign in here
              </Link>
            </p>
            <p className="text-sm text-gray-400">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                ← Back to home
              </Link>
            </p>
          </div>
        </LiquidGlassCard>
      </div>
    </div>
  );
}