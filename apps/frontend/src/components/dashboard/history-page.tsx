'use client';

import { HistoryManager } from "./history-manager";

export function HistoryPage() {
  return (
    <div className="h-full p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">History</h1>
          <p className="text-gray-400">View and manage your previous audio processing jobs.</p>
        </div>

        <div className="h-full">
          <HistoryManager />
        </div>
      </div>
    </div>
  );
}