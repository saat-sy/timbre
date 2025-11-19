'use client';

import { useParams, useRouter } from 'next/navigation';
import { withConfirmedAuth } from '../../../lib/auth';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../../components/dashboard';

function VideoPlayerContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="h-full p-6 animate-fadeIn">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Video Player</h1>
          <p className="text-gray-400">Session: {sessionId}</p>
        </div>

        {/* Video Player */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden animate-slideUp">
          <video
            src={videoUrl}
            controls
            className="w-full aspect-video bg-black"
            autoPlay
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Video Info */}
        <div
          className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-slideUp"
          style={{ animationDelay: '100ms' }}
        >
          <h2 className="text-white font-semibold mb-2">Video Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Session ID:</span>
              <span className="text-white font-mono">{sessionId}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
          animation-fill-mode: both;
        }
      `}</style>
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
