'use client';

import { useAuth } from "../../../lib/auth";
import { amplifyAuth } from "../../../lib/auth/amplify-auth";
import { LiquidGlassCard } from "@repo/ui/liquid-glass-card";
import { GradientButton } from "@repo/ui/gradient-button";

export function AccountPage() {
  const { user, refreshUser } = useAuth();

  const handleLogout = async () => {
    try {
      await amplifyAuth.logout();
      await refreshUser();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Account</h1>
          <p className="text-gray-400">Manage your account settings and profile information.</p>
        </div>

        <div className="grid gap-6">
          {/* Profile Card */}
          <LiquidGlassCard className="p-6">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">
                  {user?.name || 'User'}
                </h3>
                <p className="text-gray-400">{user?.email}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Member since {user?.createdAt?.toLocaleDateString()}
                </p>
              </div>
            </div>
          </LiquidGlassCard>

          {/* Account Details */}
          <LiquidGlassCard className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Profile Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Email</label>
                <input 
                  type="email" 
                  value={user?.email || ''} 
                  disabled
                  className="w-full p-3 bg-black/50 border border-white/20 rounded-lg text-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Display Name</label>
                <input 
                  type="text" 
                  value={user?.name || ''} 
                  placeholder="Enter your display name"
                  className="w-full p-3 bg-black/50 border border-white/20 rounded-lg text-white"
                />
              </div>
            </div>
          </LiquidGlassCard>

          {/* Subscription */}
          <LiquidGlassCard className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Subscription</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">Free Plan</div>
                <div className="text-sm text-gray-400">5 uploads per month</div>
              </div>
              <GradientButton size="sm">
                Upgrade
              </GradientButton>
            </div>
          </LiquidGlassCard>

          {/* Danger Zone */}
          <LiquidGlassCard className="p-6 border-red-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">Account Actions</h3>
            <div className="space-y-3">
              <GradientButton
                onClick={handleLogout}
                variant="secondary"
                className="w-full"
              >
                Sign Out
              </GradientButton>
              <button className="w-full p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors">
                Delete Account
              </button>
            </div>
          </LiquidGlassCard>
        </div>
      </div>
    </div>
  );
}