'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import { useAudioStream } from './useAudioStream';
import { MusicalContext } from './MusicalContextDisplay';

interface CustomVideoPlayerProps {
    src: string;
    initialPaused?: boolean;
    onTimeUpdate?: (currentTime: number) => void;
    onPlay?: () => void;
    onPause?: () => void;
    onContextUpdate?: (context: MusicalContext | null) => void;
    sessionId: string;
}

export function CustomVideoPlayer({
    src,
    initialPaused = true,
    onTimeUpdate,
    onPlay,
    onPause,
    onContextUpdate,
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

    const { play: playAudio, pause: pauseAudio, stop: stopAudio, seek, isReady, isBuffering, bufferedDuration, musicalContext } = useAudioStream({
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

    useEffect(() => {
        onContextUpdate?.(musicalContext);
    }, [musicalContext, onContextUpdate]);

    return (
        <div className="relative group rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <video
                ref={videoRef}
                src={src}
                className="w-full aspect-video object-contain cursor-pointer bg-black"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => {
                    setIsPlaying(false);
                    pauseAudio();
                }}
                onClick={togglePlay}
            />

            {/* Overlay Controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 md:p-4 pointer-events-none">

                <div className="flex items-end gap-3 md:gap-4 pointer-events-auto w-full">
                    {/* Play/Pause Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            togglePlay();
                        }}
                        className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all hover:scale-110 active:scale-95 shadow-lg shrink-0 mb-0.5"
                    >
                        {isPlaying ? (
                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 md:w-5 md:h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>

                    {/* Progress Section */}
                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                        {/* Progress Bar Container */}
                        <div
                            ref={progressBarRef}
                            className="w-full h-2 md:h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer hover:h-3 md:hover:h-2 transition-all relative group/progress"
                            onMouseDown={handleSeekStart}
                        >
                            {/* Buffer Bar */}
                            <div
                                className="absolute top-0 left-0 h-full bg-white/20 transition-all duration-300 ease-linear"
                                style={{ width: `${Math.min(bufferPercentage, 100)}%` }}
                            />

                            {/* Playback Progress with Gradient */}
                            <div
                                className="h-full bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary rounded-full transition-all duration-100 ease-linear relative z-10 shadow-[0_0_8px_rgba(255,85,0,0.5)]"
                                style={{ width: `${progressPercentage}%` }}
                            >
                                {/* Progress Thumb */}
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                            </div>
                        </div>

                        {/* Time Display Below Progress */}
                        <div className="flex items-center justify-between px-0.5">
                            <div className="text-[10px] md:text-xs font-mono text-white/70">
                                {formatTime(currentTime)}
                            </div>
                            <div className="text-[10px] md:text-xs font-mono text-white/50">
                                {formatTime(duration)}
                            </div>
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
                        className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border-2 border-white/20 pointer-events-auto cursor-pointer hover:scale-110 hover:bg-black/70 transition-all shadow-2xl ${isConnecting || isBuffering ? 'cursor-wait' : ''}`}
                    >
                        {!isConnecting && !isBuffering ? (
                            <svg className="w-10 h-10 text-white fill-current ml-1" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        ) : (
                            <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                    </div>
                </div>
            )}

            {/* Buffering Spinner Overlay (when playing but buffering) */}
            {isPlaying && isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/30 backdrop-blur-sm z-50">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 border-4 border-white/20 border-t-accent-primary rounded-full animate-spin" />
                        <span className="text-white/70 text-sm font-medium">Buffering...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
