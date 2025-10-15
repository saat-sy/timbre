"use client";

import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { GradientButton } from "@repo/ui/gradient-button";
import { LiquidGlassCard } from "@repo/ui/liquid-glass-card";
import Link from "next/link";

export function DashboardNavigation() {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/dashboard" className="text-2xl font-bold gradient-text hover:scale-105 transition-transform">
            Timbre
          </Link>
        </div>
        
        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          <Link 
            href="/dashboard"
            className="text-gray-300 hover:text-white transition-colors hover:scale-105 transform duration-200"
          >
            Dashboard
          </Link>
          <Link 
            href="/dashboard/history"
            className="text-gray-300 hover:text-white transition-colors hover:scale-105 transform duration-200"
          >
            History
          </Link>
          <button className="text-gray-300 hover:text-white transition-colors hover:scale-105 transform duration-200">
            Settings
          </button>
        </div>
        
        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-3 text-white hover:text-gray-300 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-sm font-semibold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="hidden md:block text-sm">
              {user?.name || user?.email?.split('@')[0]}
            </span>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 origin-top-right">
              <LiquidGlassCard className="p-4 space-y-4">
                {/* User Info */}
                <div className="border-b border-white/10 pb-3">
                  <p className="text-sm font-medium text-white">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Member since {user?.createdAt?.toLocaleDateString()}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="space-y-2">
                  <button className="w-full text-left text-sm text-gray-300 hover:text-white transition-colors py-2 px-2 rounded hover:bg-white/5">
                    Profile Settings
                  </button>
                  <button className="w-full text-left text-sm text-gray-300 hover:text-white transition-colors py-2 px-2 rounded hover:bg-white/5">
                    Billing
                  </button>
                  <button className="w-full text-left text-sm text-gray-300 hover:text-white transition-colors py-2 px-2 rounded hover:bg-white/5">
                    Help & Support
                  </button>
                </div>

                {/* Logout Button */}
                <div className="border-t border-white/10 pt-3">
                  <GradientButton 
                    onClick={handleLogout}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    Sign Out
                  </GradientButton>
                </div>
              </LiquidGlassCard>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close menu */}
      {isUserMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </nav>
  );
}