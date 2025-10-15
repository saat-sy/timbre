"use client";

import { useState } from "react";
import { LiquidGlassCard } from "@repo/ui/liquid-glass-card";
import { GradientButton } from "@repo/ui/gradient-button";
import Link from "next/link";

export function CTASection() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="relative px-6 py-20">
      <div className="max-w-4xl mx-auto text-center">
        <LiquidGlassCard 
          variant="primary" 
          className={`p-12 transition-all duration-500 ${
            isHovered ? 'scale-[1.02] shadow-2xl shadow-purple-500/20' : ''
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Create Amazing{" "}
              <span className="gradient-text animate-pulse">Music</span>?
            </h2>
            
            <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Join thousands of creators who are already using Timbre to enhance their videos with AI-generated music.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/auth/register">
                <GradientButton 
                  variant="primary" 
                  size="lg" 
                  className="w-full sm:w-auto group relative overflow-hidden"
                >
                  <span className="relative z-10">Start Your Free Trial</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </GradientButton>
              </Link>
              
              <Link href="/auth/login">
                <GradientButton 
                  variant="ghost" 
                  size="lg" 
                  className="w-full sm:w-auto group"
                >
                  <span className="group-hover:scale-105 transition-transform duration-200">
                    Sign In
                  </span>
                </GradientButton>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="text-sm text-gray-400 mb-4">Trusted by creators worldwide</p>
              <div className="flex justify-center items-center space-x-8 opacity-60">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm">1000+ Videos Enhanced</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-300" />
                  <span className="text-sm">500+ Happy Creators</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-700" />
                  <span className="text-sm">99% Satisfaction Rate</span>
                </div>
              </div>
            </div>
          </div>
        </LiquidGlassCard>
      </div>
    </section>
  );
}