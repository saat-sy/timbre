import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../lib/auth';
import { useDashboard } from '../context';
import { useRouter, usePathname } from 'next/navigation';

export function Sidebar() {
  const { user } = useAuth();
  const { activePage, setActivePage } = useDashboard();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigation = (page: 'upload' | 'settings' | 'account') => {
    if (pathname !== '/dashboard') {
      if (page === 'upload') {
        router.push('/dashboard');
      } else {
        router.push(`/dashboard?page=${page}`);
      }
    } else {
      setActivePage(page);
    }
    setIsDropdownOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => handleNavigation('upload')}
            className="hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl font-light gradient-text">timbre</span>
          </button>

          {/* Navigation */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-8 h-8 bg-gradient-to-r from-accent-secondary to-accent-primary rounded-full flex items-center justify-center text-sm font-semibold hover:opacity-80 transition-opacity"
            >
              S
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur-md border border-white/10 rounded-lg shadow-lg overflow-hidden">
                <button
                  onClick={() => handleNavigation('account')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${activePage === 'account' && pathname === '/dashboard'
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span className="text-sm font-medium">Account</span>
                </button>

                <button
                  onClick={() => handleNavigation('settings')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${activePage === 'settings' && pathname === '/dashboard'
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium">Settings</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
