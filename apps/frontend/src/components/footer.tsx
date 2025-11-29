'use client';

import Link from 'next/link';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-lg">
            <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
                {/* Brand Section */}
                <div className="flex flex-col items-center md:items-start space-y-2 text-center md:text-left">
                    <Link href="/" className="inline-block">
                        <span className="text-2xl font-light bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent hover:scale-105 transition-transform duration-200">
                            timbre
                        </span>
                    </Link>
                    <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
                        Transform your videos with AI-generated music.
                    </p>
                </div>

                {/* Social Icons */}
                <div className="flex items-center space-x-4">
                    <SocialLink href="https://github.com/saat-sy/timbre" label="GitHub">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </SocialLink>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="border-t border-white/5 bg-black/40">
                <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col-reverse md:flex-row justify-between items-center gap-4 text-xs text-text-secondary/60 text-center md:text-left">
                    <p>© {currentYear} Timbre. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            aria-label={label}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-text-secondary hover:bg-white/10 hover:text-white transition-all duration-200 hover:scale-110"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {children}
            </svg>
        </Link>
    );
}
