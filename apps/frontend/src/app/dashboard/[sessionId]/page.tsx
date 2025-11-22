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

  // Extract current mood for dynamic background
  const currentMood = musicalContext?.scene_analysis?.find(
    (scene: any) => currentTime >= scene.start_time && currentTime < scene.end_time
  )?.mood?.toLowerCase();

  const getBackgroundGradient = (mood: string | undefined) => {
    switch (mood) {
      case 'tense':
        return 'from-gray-900 via-blue-900/20 to-black';
      case 'ominous':
        return 'from-gray-900 via-purple-900/20 to-black';
      case 'anticipatory':
        return 'from-gray-900 via-yellow-900/20 to-black';
      case 'confrontational':
        return 'from-gray-900 via-red-900/20 to-black';
      case 'chaotic':
        return 'from-gray-900 via-orange-900/20 to-black';
      case 'cautious':
        return 'from-gray-900 via-indigo-900/20 to-black';
      case 'anxious':
        return 'from-gray-900 via-teal-900/20 to-black';
      case 'serious':
        return 'from-gray-900 via-slate-900/20 to-black';
      case 'intense':
        return 'from-gray-900 via-red-950/30 to-black';
      case 'sarcastic':
        return 'from-gray-900 via-pink-900/20 to-black';
      case 'surprised':
        return 'from-gray-900 via-cyan-900/20 to-black';
      case 'resentful':
        return 'from-gray-900 via-rose-900/20 to-black';
      default:
        return 'from-gray-900 via-gray-900 to-black';
    }
  };

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
          <div className="w-16 h-16 border-3 border-white/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
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
    <div className={`h-screen w-full flex flex-col gap-2 p-2 overflow-hidden transition-colors duration-1000 bg-gradient-to-br ${getBackgroundGradient(currentMood)}`}>

      {/* TOP: Global Context Only */}
      <div className="shrink-0 z-20 relative">
        <TopContextBar context={musicalContext} currentTime={currentTime} />
      </div>

      {/* MIDDLE: Video Player */}
      <div className="flex-1 min-h-0 flex items-center justify-center relative bg-black/60 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 shadow-lg">

        {/* Video Container */}
        <div className="aspect-video w-full max-h-full max-w-5xl bg-black shadow-2xl rounded-xl overflow-hidden border border-white/10 ring-1 ring-white/5 relative z-10">
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

      {/* BOTTOM: Musical Block Card (Squared Up) */}
      <div className="shrink-0 z-20 relative px-2">
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
