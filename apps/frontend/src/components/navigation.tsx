"use client";

import { useState, useEffect } from "react";
import { GradientButton } from "@repo/ui/gradient-button";
import Link from "next/link";

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300 ${
      isScrolled 
        ? 'bg-black/80 backdrop-blur-md border-b border-white/10' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="text-2xl font-bold gradient-text hover:scale-105 transition-transform">
            Timbre
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <button 
            onClick={() => scrollToSection('features')}
            className="text-gray-300 hover:text-white transition-colors hover:scale-105 transform duration-200"
          >
            Features
          </button>
          <button 
            onClick={() => scrollToSection('how-it-works')}
            className="text-gray-300 hover:text-white transition-colors hover:scale-105 transform duration-200"
          >
            How It Works
          </button>
        </div>
        
        {/* Desktop CTA Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/login">
            <GradientButton variant="ghost" size="sm">
              Sign In
            </GradientButton>
          </Link>
          <Link href="/register">
            <GradientButton variant="primary" size="sm">
              Get Started
            </GradientButton>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-white hover:text-gray-300 transition-colors"
          aria-label="Toggle mobile menu"
        >
          <svg 
            className={`w-6 h-6 transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-90' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden transition-all duration-300 overflow-hidden ${
        isMobileMenuOpen 
          ? 'max-h-96 opacity-100 mt-4' 
          : 'max-h-0 opacity-0'
      }`}>
        <div className="bg-black/90 backdrop-blur-md rounded-2xl border border-white/10 p-6 space-y-4">
          <button 
            onClick={() => scrollToSection('features')}
            className="block w-full text-left text-gray-300 hover:text-white transition-colors py-2"
          >
            Features
          </button>
          <button 
            onClick={() => scrollToSection('how-it-works')}
            className="block w-full text-left text-gray-300 hover:text-white transition-colors py-2"
          >
            How It Works
          </button>
          <div className="pt-4 border-t border-white/10 space-y-3">
            <Link href="/login" className="block">
              <GradientButton variant="ghost" size="sm" className="w-full">
                Sign In
              </GradientButton>
            </Link>
            <Link href="/register" className="block">
              <GradientButton variant="primary" size="sm" className="w-full">
                Get Started
              </GradientButton>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}