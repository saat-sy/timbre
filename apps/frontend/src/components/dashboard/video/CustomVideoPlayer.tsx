'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import { useAudioStream } from './useAudioStream';

interface CustomVideoPlayerProps {
    src: string;
    initialPaused?: boolean;
    onTimeUpdate?: (currentTime: number) => void;
    onPlay?: () => void;
    onPause?: () => void;
    sessionId: string;
}

export function CustomVideoPlayer({
    src,
    initialPaused = true,
    onTimeUpdate,
    onPlay,
    onPause,
    sessionId,
}: CustomVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(!initialPaused);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isConnecting, setIsConnecting] = useState(false);

    const handleAudioStop = useCallback(() => {
        console.log('Audio stream stopped');
    }, []);

    const { play: playAudio, pause: pauseAudio, stop: stopAudio, seek, isReady, isBuffering, bufferedDuration } = useAudioStream({
        videoDuration: duration,
        onStop: handleAudioStop,
        initialPaused: initialPaused,
        sessionId,
    });

    const initialPauseApplied = useRef(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || initialPauseApplied.current) return;

        initialPauseApplied.current = true;

        if (initialPaused) {
            video.pause();
        } else {
            video.play()
                .then(() => {
                    playAudio();
                })
                .catch(() => {
                    // Auto-play might be blocked
                    setIsPlaying(false);
                });
        }
    }, [initialPaused, playAudio, pauseAudio]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAudio();
        };
    }, [stopAudio]);

    const togglePlay = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;

        if (!isReady && video.paused) {
            setIsConnecting(true);
            playAudio();
            return;
        }

        if (video.paused) {
            try {
                await video.play();
                playAudio();
                setIsPlaying(true);
                onPlay?.();
            } catch (error) {
                console.error('Error playing video:', error);
                setIsPlaying(false);
            }
        } else {
            video.pause();
            pauseAudio();
            setIsPlaying(false);
            onPause?.();
        }
    }, [isReady, playAudio, pauseAudio, onPlay, onPause]);

    useEffect(() => {
        if (isConnecting && isReady) {
            setIsConnecting(false);
            togglePlay();
        }
    }, [isConnecting, isReady, togglePlay]);

    // Handle buffering state
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isBuffering) {
            video.pause();
        } else if (isPlaying && !video.ended && !video.paused) {
            video.play().catch(() => { });
        } else if (isPlaying && video.paused && !video.ended) {
            video.play().catch(() => { });
        }
    }, [isBuffering, isPlaying]);

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;
        setCurrentTime(video.currentTime);
        onTimeUpdate?.(video.currentTime);
    };

    const handleLoadedMetadata = () => {
        const video = videoRef.current;
        if (!video) return;
        setDuration(video.duration);
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const [isDragging, setIsDragging] = useState(false);
    const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);
    const progressBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                if (wasPlayingBeforeDrag) {
                    videoRef.current?.play().catch(() => { });
                    playAudio();
                    setIsPlaying(true);
                }

                // Seek audio to new position
                if (videoRef.current) {
                    seek(videoRef.current.currentTime);
                }
            }
        };

        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!isDragging || !progressBarRef.current || !videoRef.current) return;

            const rect = progressBarRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            const percentage = Math.max(0, Math.min(1, x / width));
            const targetTime = percentage * videoRef.current.duration;

            // Clamp to buffered duration
            const newTime = Math.min(targetTime, bufferedDuration);

            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        };

        if (isDragging) {
            window.addEventListener('mouseup', handleGlobalMouseUp);
            window.addEventListener('mousemove', handleGlobalMouseMove);
        }

        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('mousemove', handleGlobalMouseMove);
        };
    }, [isDragging, wasPlayingBeforeDrag, playAudio, bufferedDuration]);

    const handleSeekStart = (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        if (!video) return;

        // Prevent default to avoid text selection etc
        e.preventDefault();

        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const percentage = Math.max(0, Math.min(1, x / width));
        const targetTime = percentage * video.duration;

        // Allow seek if within buffered range (with a small buffer for floating point)
        if (targetTime <= bufferedDuration + 0.5) {
            setWasPlayingBeforeDrag(!video.paused);
            video.pause();
            pauseAudio();
            setIsPlaying(false);

            setIsDragging(true);

            // Clamp initial click too
            const newTime = Math.min(targetTime, bufferedDuration);

            video.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
    const bufferPercentage = duration > 0 ? (bufferedDuration / duration) * 100 : 0;

    return (
        <div className="relative group bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <video
                ref={videoRef}
                src={src}
                className="w-full aspect-video object-contain cursor-pointer"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => {
                    setIsPlaying(false);
                    pauseAudio();
                }}
                onClick={togglePlay}
            />

            {/* Overlay Controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 pointer-events-none">

                {/* Progress Bar */}
                <div
                    ref={progressBarRef}
                    className="w-full h-1.5 bg-white/20 rounded-full mb-4 overflow-hidden cursor-pointer pointer-events-auto hover:h-2.5 transition-all relative"
                    onMouseDown={handleSeekStart}
                >
                    {/* Buffer Bar */}
                    <div
                        className="absolute top-0 left-0 h-full bg-white/30 transition-all duration-300 ease-linear"
                        style={{ width: `${Math.min(bufferPercentage, 100)}%` }}
                    />

                    {/* Playback Progress */}
                    <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-100 ease-linear relative z-10"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>

                <div className="flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePlay();
                            }}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
                        >
                            {isPlaying ? (
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            )}
                        </button>

                        <div className="text-sm font-medium text-white/90 font-mono">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Center Play Button (only when paused) */}
            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            togglePlay();
                        }}
                        className={`w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10 pointer-events-auto cursor-pointer hover:scale-110 transition-transform ${isConnecting || isBuffering ? 'cursor-wait' : ''}`}
                    >
                        {!isConnecting && !isBuffering ? (
                            <svg className="w-8 h-8 text-white fill-current" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        ) : (
                            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                    </div>
                </div>
            )}

            {/* Buffering Spinner Overlay (when playing but buffering) */}
            {isPlaying && isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[1px]">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
