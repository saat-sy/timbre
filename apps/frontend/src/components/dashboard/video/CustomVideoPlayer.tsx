'use client';

import { useRef, useState, useEffect } from 'react';

interface CustomVideoPlayerProps {
    src: string;
    initialPaused?: boolean;
    onTimeUpdate?: (currentTime: number) => void;
    onPlay?: () => void;
    onPause?: () => void;
}

export function CustomVideoPlayer({
    src,
    initialPaused = true,
    onTimeUpdate,
    onPlay,
    onPause,
}: CustomVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(!initialPaused);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (initialPaused) {
            video.pause();
        } else {
            video.play().catch(() => {
                // Auto-play might be blocked
                setIsPlaying(false);
            });
        }
    }, [initialPaused]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play();
            setIsPlaying(true);
            onPlay?.();
        } else {
            video.pause();
            setIsPlaying(false);
            onPause?.();
        }
    };

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
    const [maxSeekTime, setMaxSeekTime] = useState<number | null>(null);
    const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);
    const progressBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                setMaxSeekTime(null);
                if (wasPlayingBeforeDrag) {
                    videoRef.current?.play().catch(() => { });
                    setIsPlaying(true);
                }
            }
        };

        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!isDragging || !progressBarRef.current || !videoRef.current || maxSeekTime === null) return;

            const rect = progressBarRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            const percentage = Math.max(0, Math.min(1, x / width));
            const targetTime = percentage * videoRef.current.duration;

            // Clamp to maxSeekTime (backward only)
            const newTime = Math.min(targetTime, maxSeekTime);

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
    }, [isDragging, maxSeekTime, wasPlayingBeforeDrag]);

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

        // Initial click check - only allow if backward
        if (targetTime < video.currentTime) {
            setWasPlayingBeforeDrag(!video.paused);
            video.pause();
            setIsPlaying(false);

            setIsDragging(true);
            setMaxSeekTime(video.currentTime); // Lock the furthest point we can go to

            video.currentTime = targetTime;
            setCurrentTime(targetTime);
        }
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="relative group bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <video
                ref={videoRef}
                src={src}
                className="w-full aspect-video object-contain cursor-pointer"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onClick={togglePlay}
            />

            {/* Overlay Controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 pointer-events-none">

                {/* Progress Bar */}
                <div
                    ref={progressBarRef}
                    className="w-full h-1.5 bg-white/20 rounded-full mb-4 overflow-hidden cursor-pointer pointer-events-auto hover:h-2.5 transition-all"
                    onMouseDown={handleSeekStart}
                >
                    <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-100 ease-linear relative"
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
                        className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10 pointer-events-auto cursor-pointer hover:scale-110 transition-transform"
                    >
                        <svg className="w-8 h-8 text-white fill-current" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
            )}
        </div>
    );
}
