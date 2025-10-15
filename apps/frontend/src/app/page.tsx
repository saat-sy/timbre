import { LiquidGlassCard } from "@repo/ui/liquid-glass-card";
import { GradientButton } from "@repo/ui/gradient-button";
import { Navigation } from "../components/navigation";
import { CTASection } from "../components/cta-section";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Navigation Header */}
      <Navigation />

      {/* Hero Section */}
      <main className="relative">
        {/* Animated Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 px-6 pt-32 pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight animate-fade-in-up">
              Transform Your Videos with{" "}
              <span className="gradient-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
                AI-Generated Music
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto animate-fade-in-up animation-delay-200" style={{ color: 'var(--text-secondary)' }}>
              Upload any video and let our AI create the perfect soundtrack. 
              From cinematic scores to ambient soundscapes, bring your content to life with custom music.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16 animate-fade-in-up animation-delay-400">
              <Link href="/register">
                <GradientButton 
                  variant="primary" 
                  size="lg" 
                  className="w-full sm:w-auto group relative overflow-hidden"
                >
                  <span className="relative z-10 group-hover:scale-105 transition-transform duration-200">
                    Start Creating Music
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </GradientButton>
              </Link>
              <Link href="/waitlist">
                <GradientButton 
                  variant="ghost" 
                  size="lg" 
                  className="w-full sm:w-auto group"
                >
                  <span className="group-hover:scale-105 transition-transform duration-200">
                    Join Waitlist
                  </span>
                </GradientButton>
              </Link>
            </div>

            {/* Demo Video Placeholder */}
            <LiquidGlassCard 
              variant="primary" 
              className="max-w-4xl mx-auto p-2 animate-fade-in-up animation-delay-600 hover:scale-[1.02] transition-all duration-500 cursor-pointer group"
            >
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="text-center relative z-10">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors duration-300 group-hover:scale-110 transform">
                    <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                    Watch Demo Video
                  </p>
                </div>
              </div>
            </LiquidGlassCard>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Choose <span className="gradient-text">Timbre</span>?
            </h2>
            <p className="text-xl max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Our AI understands your video content and creates music that perfectly matches the mood, pace, and style you need.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <LiquidGlassCard 
              variant="primary" 
              className="p-8 text-center group cursor-pointer hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/20"
            >
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-indigo-300 transition-colors duration-300">
                AI-Powered Composition
              </h3>
              <p className="group-hover:text-gray-300 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                Advanced AI analyzes your video content to generate music that perfectly matches the mood and pacing.
              </p>
            </LiquidGlassCard>

            {/* Feature 2 */}
            <LiquidGlassCard 
              variant="secondary" 
              className="p-8 text-center group cursor-pointer hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20"
            >
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-purple-300 transition-colors duration-300">
                Video-Sync Technology
              </h3>
              <p className="group-hover:text-gray-300 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                Music automatically syncs with your video's rhythm, cuts, and emotional beats for seamless integration.
              </p>
            </LiquidGlassCard>

            {/* Feature 3 */}
            <LiquidGlassCard 
              variant="accent" 
              className="p-8 text-center group cursor-pointer hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-pink-500/20"
            >
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-pink-300 transition-colors duration-300">
                Lightning Fast
              </h3>
              <p className="group-hover:text-gray-300 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                Generate professional-quality music in minutes, not hours. Perfect for creators on tight deadlines.
              </p>
            </LiquidGlassCard>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative px-6 py-20 bg-gradient-to-b from-transparent to-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-xl max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Three simple steps to transform your videos with AI-generated music
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center group">
              <LiquidGlassCard 
                variant="primary" 
                className="p-8 mb-6 hover:scale-105 transition-all duration-500 hover:shadow-xl hover:shadow-indigo-500/20"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-2xl font-bold group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  1
                </div>
                <h3 className="text-xl font-bold mb-4 group-hover:text-indigo-300 transition-colors duration-300">
                  Upload Your Video
                </h3>
                <p className="group-hover:text-gray-300 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  Simply drag and drop your video file or browse to select it from your device.
                </p>
              </LiquidGlassCard>
              
              {/* Connection Arrow */}
              <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                <svg className="w-8 h-8 text-gray-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Step 2 */}
            <div className="text-center group relative">
              <LiquidGlassCard 
                variant="secondary" 
                className="p-8 mb-6 hover:scale-105 transition-all duration-500 hover:shadow-xl hover:shadow-purple-500/20"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl font-bold group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  2
                </div>
                <h3 className="text-xl font-bold mb-4 group-hover:text-purple-300 transition-colors duration-300">
                  Describe Your Vision
                </h3>
                <p className="group-hover:text-gray-300 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  Tell our AI what kind of music you want - genre, mood, instruments, or any creative direction.
                </p>
              </LiquidGlassCard>
              
              {/* Connection Arrow */}
              <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                <svg className="w-8 h-8 text-gray-600 animate-pulse animation-delay-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <LiquidGlassCard 
                variant="accent" 
                className="p-8 mb-6 hover:scale-105 transition-all duration-500 hover:shadow-xl hover:shadow-pink-500/20"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center text-2xl font-bold group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  3
                </div>
                <h3 className="text-xl font-bold mb-4 group-hover:text-pink-300 transition-colors duration-300">
                  Get Your Music
                </h3>
                <p className="group-hover:text-gray-300 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  Download your video with perfectly synchronized AI-generated music in minutes.
                </p>
              </LiquidGlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTASection />

      {/* Footer */}
      <footer className="relative px-6 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-2xl font-bold gradient-text">Timbre</h3>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                Transform your videos with AI-generated music
              </p>
            </div>
            <div className="flex space-x-6">
              <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/register" className="text-gray-400 hover:text-white transition-colors">
                Get Started
              </Link>
              <Link href="/waitlist" className="text-gray-400 hover:text-white transition-colors">
                Waitlist
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}