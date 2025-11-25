'use client';

import { useParams, useRouter } from 'next/navigation';
import { withConfirmedAuth } from '../../../lib/auth';
import { useEffect, useState } from 'react';
import { DashboardLayout, CustomVideoPlayer } from '../../../components/dashboard';
import { TopContextBar, MusicalBlockBar } from '../../../components/dashboard/video/MusicalContextDisplay';

function VideoPlayerContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [musicalContext, setMusicalContext] = useState<any | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Add animation styles
  const animationStyles = `
    @keyframes slideFade {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-slideFade {
      animation: slideFade 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }
  `;

  useEffect(() => {
    // Retrieve the uploaded video from sessionStorage
    const storedVideoData = sessionStorage.getItem(`video_${sessionId}`);

    if (storedVideoData) {
      try {
        const { videoUrl } = JSON.parse(storedVideoData);
        setVideoUrl(videoUrl);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load video data');
        setIsLoading(false);
      }
    } else {
      setError('No video found for this session');
      setIsLoading(false);
    }
  }, [sessionId]);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-3 border-white/20 border-t-accent-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60 text-sm">Loading your video...</p>
        </div>
      </div>
    );
  }

  if (error || !videoUrl) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 mb-6">
            <svg
              className="w-12 h-12 text-red-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-white mb-2">
              Video Not Found
            </h2>
            <p className="text-gray-400">
              {error || 'The video you are looking for does not exist.'}
            </p>
          </div>
          <button
            onClick={handleBackToDashboard}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col gap-2 p-3 overflow-hidden relative">
      <style>{animationStyles}</style>
      
      {/* Background - matching UploadPage style */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 -z-10" />

      {/* TOP: Global Context Only */}
      <div className="shrink-0 z-20 relative animate-slideFade">
        <TopContextBar context={musicalContext} currentTime={currentTime} />
      </div>

      {/* MIDDLE: Video Player */}
      <div className="flex-1 min-h-0 flex items-center justify-center relative z-10">
        {/* Video Container with Enhanced Shadow */}
        <div className="aspect-video w-full max-h-full max-w-5xl relative">
          {/* Glow Effect Behind Video */}
          <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/20 via-accent-secondary/20 to-accent-primary/20 blur-2xl scale-105 opacity-50" />
          
          <div className="relative z-10">
            <CustomVideoPlayer
              src={videoUrl}
              initialPaused={true}
              onTimeUpdate={(time: number) => setCurrentTime(time)}
              onPlay={() => console.log('Command: PLAY')}
              onPause={() => console.log('Command: PAUSE')}
              onContextUpdate={setMusicalContext}
              sessionId={sessionId}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM: Musical Block Card */}
      <div className="shrink-0 z-20 relative animate-slideFade" style={{ animationDelay: '0.1s' }}>
        <MusicalBlockBar context={musicalContext} currentTime={currentTime} />
      </div>

    </div>
  );
}

function VideoPlayerPage() {
  return (
    <DashboardLayout>
      <VideoPlayerContent />
    </DashboardLayout>
  );
}

export default withConfirmedAuth(VideoPlayerPage);
