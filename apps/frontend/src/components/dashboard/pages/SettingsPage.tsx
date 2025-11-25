'use client';

import { LiquidGlassCard } from '@/components/ui';

export function SettingsPage() {
  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">
            Manage your application preferences and configuration.
          </p>
        </div>

        <div className="grid gap-6">
          <LiquidGlassCard className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              App Preferences
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Dark Mode</div>
                  <div className="text-sm text-gray-400">
                    Use dark theme throughout the application
                  </div>
                </div>
                <button className="w-12 h-6 bg-accent-primary rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Auto-save</div>
                  <div className="text-sm text-gray-400">
                    Automatically save your work
                  </div>
                </div>
                <button className="w-12 h-6 bg-accent-primary rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                </button>
              </div>
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              Audio Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">
                  Default Quality
                </label>
                <select className="w-full p-3 bg-black/50 border border-white/20 rounded-lg text-white">
                  <option>High (320kbps)</option>
                  <option>Medium (192kbps)</option>
                  <option>Low (128kbps)</option>
                </select>
              </div>
              <div>
                <label className="block text-white font-medium mb-2">
                  Output Format
                </label>
                <select className="w-full p-3 bg-black/50 border border-white/20 rounded-lg text-white">
                  <option>MP3</option>
                  <option>WAV</option>
                  <option>FLAC</option>
                </select>
              </div>
            </div>
          </LiquidGlassCard>
        </div>
      </div>
    </div>
  );
}
