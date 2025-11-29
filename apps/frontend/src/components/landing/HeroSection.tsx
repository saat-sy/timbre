'use client';

import React from 'react';
import Link from 'next/link';
import { GradientButton } from '@/components/ui';

export const HeroSection = () => {
    const scrollToGallery = () => {
        const gallerySection = document.getElementById('gallery');
        if (gallerySection) {
            gallerySection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <section className="relative flex flex-col items-center justify-center py-20 gap-20 min-h-screen">
            {/* Animated Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-accent-secondary/20 to-accent-primary/20 rounded-full blur-3xl delay-1000 animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 rounded-full blur-2xl delay-500"></div>
            </div>

            {/* Hero Content */}
            <div className="relative z-10 px-4 md:px-6 w-full max-w-5xl mx-auto text-center mt-10 md:mt-0">
                <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm animate-fade-in-up">
                    <span className="text-sm font-medium text-accent-primary bg-clip-text text-transparent bg-gradient-to-r from-accent-primary to-accent-secondary">
                        ✨ Now in Public Beta
                    </span>
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50 tracking-tight mb-6 md:mb-8 drop-shadow-sm animate-fade-in-up delay-100">
                    Transform Videos with{' '}
                    <span className="bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary bg-clip-text text-transparent block mt-2 pb-2">
                        AI Music
                    </span>
                </h1>

                <p
                    className="text-lg md:text-2xl mb-8 md:mb-12 max-w-3xl mx-auto animate-fade-in-up animation-delay-200 text-gray-400 font-light tracking-wide px-2 leading-relaxed"
                >
                    Upload any video and let our AI create the perfect soundtrack.
                    From cinematic scores to ambient soundscapes, bring your content
                    to life with custom music generated in seconds.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center animate-fade-in-up animation-delay-400 px-4">
                    <Link href="/auth/register" className="w-full sm:w-auto">
                        <GradientButton
                            variant="primary"
                            size="lg"
                            className="w-full sm:w-auto group relative overflow-hidden shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/40 transition-all duration-300"
                        >
                            <span className="relative z-10 group-hover:scale-105 transition-transform duration-200 font-semibold">
                                Start Creating Free
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        </GradientButton>
                    </Link>
                    <button onClick={scrollToGallery} className="w-full sm:w-auto">
                        <GradientButton
                            variant="ghost"
                            size="lg"
                            className="w-full sm:w-auto group border border-white/10 hover:bg-white/5"
                        >
                            <span className="group-hover:scale-105 transition-transform duration-200">
                                View Gallery
                            </span>
                        </GradientButton>
                    </button>
                </div>
            </div>
        </section>
    );
};
