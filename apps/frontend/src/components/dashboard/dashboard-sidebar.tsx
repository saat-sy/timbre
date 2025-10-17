"use client";

import { useState, useRef } from "react";
import { useAuth } from "../../lib/auth";
import { useDashboard } from "./dashboard-context";

interface DashboardSidebarProps {
  className?: string;
}

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const { user } = useAuth();
  const { activePage, setActivePage } = useDashboard();
  const [isExpanded, setIsExpanded] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);





  const handleMouseEnter = () => {
    if (!isExpanded) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsExpanded(true);
      }, 300);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    setIsExpanded(false);
  };

  return (
    <>
      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ${
          isExpanded ? 'w-96' : 'w-16'
        } ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="h-full bg-black/80 backdrop-blur-md border-r border-white/10 flex flex-col relative">
          
          {/* Sidebar Header */}
          <div className="p-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center justify-between">
              {/* Logo Section */}
              <div className="flex items-center space-x-3">
                {/* Logo Icon - Always visible */}
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
                
                {/* Logo Text - Only when expanded */}
                {isExpanded && (
                  <div className="text-xl font-bold gradient-text">
                    Timbre
                  </div>
                )}
              </div>
              
              {/* Expand/Collapse Button - Only when expanded */}
              {isExpanded && (
                <button
                  onClick={() => {
                    setIsExpanded(false);
                  }}
                  className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 flex-shrink-0"
                  title="Collapse sidebar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Top Navigation */}
          <div className="p-3 space-y-3 flex-shrink-0">
            {/* Upload Link */}
            <button
              onClick={() => {
                setActivePage('upload');
                setIsExpanded(false);
              }}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                activePage === 'upload' 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={!isExpanded ? 'Upload' : ''}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {isExpanded && <span className="text-sm font-medium">Upload</span>}
            </button>

            {/* History Button */}
            <button
              onClick={() => {
                setActivePage('history');
                setIsExpanded(false);
              }}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                activePage === 'history' 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={!isExpanded ? 'History' : ''}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isExpanded && <span className="text-sm font-medium">History</span>}
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Bottom Navigation */}
          <div className="p-3 space-y-3 border-t border-white/10 flex-shrink-0">
            {/* Settings Button */}
            <button
              onClick={() => {
                setActivePage('settings');
                setIsExpanded(false);
              }}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                activePage === 'settings' 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={!isExpanded ? 'Settings' : ''}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isExpanded && <span className="text-sm font-medium">Settings</span>}
            </button>

            {/* Account Button */}
            <button
              onClick={() => {
                setActivePage('account');
                setIsExpanded(false);
              }}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                activePage === 'account' 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={!isExpanded ? 'Account' : ''}
            >
              <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              {isExpanded && <span className="text-sm font-medium">Account</span>}
            </button>
          </div>
        </div>
      </div>



      {/* Overlay for mobile */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => {
            setIsExpanded(false);
          }}
        />
      )}
    </>
  );
}