import { LiquidGlassCard } from '@/components/ui';
import { GradientButton } from '@/components/ui';
import { Navigation } from '../components/navigation';
import { CTASection } from '../components/cta-section';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Navigation Header */}
      <Navigation />

      {/* Hero Section */}
      <main className="relative flex-grow flex items-center justify-center">
        {/* Animated Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-accent-secondary/20 to-accent-primary/20 rounded-full blur-3xl delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 rounded-full blur-2xl delay-500"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 px-6 w-full max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-extralight text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70 tracking-tight mb-8 drop-shadow-sm animate-fade-in-up">
            Transform Your Videos with{' '}
            <span className="bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary bg-clip-text text-transparent">
              AI-Generated Music
            </span>
          </h1>

          <p
            className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto animate-fade-in-up animation-delay-200 text-white/50 font-light tracking-wide"
          >
            Upload any video and let our AI create the perfect soundtrack.
            From cinematic scores to ambient soundscapes, bring your content
            to life with custom music.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in-up animation-delay-400">
            <Link href="/auth/register">
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
            <Link href="/auth/login">
              <GradientButton
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto group"
              >
                <span className="group-hover:scale-105 transition-transform duration-200">
                  Sign In
                </span>
              </GradientButton>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
