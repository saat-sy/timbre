import { Navigation } from '../components/navigation';
import { Footer } from '@/components/footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { DataFlowSection } from '@/components/landing/DataFlowSection';
import VideoCarousel from '@/components/VideoCarousel';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Navigation Header */}
      <Navigation />

      <main className="flex-grow">
        <HeroSection />

        <div id="gallery" className="py-20">
          <VideoCarousel />
        </div>

        <FeaturesSection />
        <DataFlowSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
