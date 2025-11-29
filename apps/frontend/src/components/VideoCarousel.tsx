'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const videos = [
    '/videos/carousel/avengers.mp4',
    '/videos/carousel/interstellar.mp4',
    '/videos/carousel/matrix.mp4',
    '/videos/carousel/spiderman.mp4',
];

const CustomVideoPlayer = ({ src, isActive }: { src: string; isActive: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (!isActive && videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [isActive]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleVideoEnded = () => {
        setIsPlaying(false);
    };

    return (
        <div className="relative h-full w-full group">
            <video
                ref={videoRef}
                src={src}
                className="h-full w-full rounded-2xl object-cover"
                playsInline
                onClick={togglePlay}
                onEnded={handleVideoEnded}
            />

            {/* Play/Pause Overlay */}
            <div
                className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
                onClick={togglePlay}
            >
                <button className="rounded-full bg-white/20 p-4 backdrop-blur-sm transition-transform hover:scale-110 hover:bg-white/30">
                    {isPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="h-8 w-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="h-8 w-8 pl-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
};

const VideoCarousel = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const getVideoIndex = (offset: number) => {
        return (currentIndex + offset + videos.length) % videos.length;
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % videos.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
    };

    const variants = {
        center: {
            x: '0%',
            scale: 1,
            zIndex: 5,
            opacity: 1,
            transition: { type: "spring" as const, stiffness: 300, damping: 30 },
        },
        left: {
            x: '-55%',
            scale: 0.7,
            zIndex: 3,
            opacity: 0.5,
            transition: { type: "spring" as const, stiffness: 300, damping: 30 },
        },
        right: {
            x: '55%',
            scale: 0.7,
            zIndex: 3,
            opacity: 0.5,
            transition: { type: "spring" as const, stiffness: 300, damping: 30 },
        },
        hidden: {
            scale: 0.5,
            opacity: 0,
            zIndex: 1,
            transition: { duration: 0.5 },
        }
    };

    // Helper to determine position variant based on index
    const getPositionVariant = (index: number) => {
        if (index === currentIndex) return 'center';
        if (index === getVideoIndex(-1)) return 'left';
        if (index === getVideoIndex(1)) return 'right';
        return 'hidden';
    };

    return (
        <div className="relative flex h-[500px] md:h-[700px] w-full items-center justify-center overflow-hidden bg-black/20 py-10">
            <div className="relative flex h-full w-full max-w-6xl items-center justify-center">
                <AnimatePresence initial={false} mode="popLayout">
                    {videos.map((video, index) => {
                        const position = getPositionVariant(index);
                        if (position === 'hidden') return null;

                        return (
                            <motion.div
                                key={video}
                                className={`absolute rounded-2xl bg-gray-800 shadow-2xl ring-1 ring-white/10 ${position !== 'center' ? 'cursor-pointer hover:opacity-90' : ''
                                    } ${position === 'center' ? 'w-[300px] h-[300px] md:w-[500px] md:h-[500px]' : 'w-[240px] h-[240px] md:w-[400px] md:h-[400px]'}`}
                                variants={variants}
                                initial={false}
                                animate={position}
                                onClick={() => {
                                    if (position === 'left') handlePrev();
                                    if (position === 'right') handleNext();
                                }}
                            >
                                {position === 'center' ? (
                                    <CustomVideoPlayer src={video} isActive={true} />
                                ) : (
                                    <>
                                        <video
                                            src={video}
                                            className="h-full w-full rounded-xl object-cover opacity-50"
                                            muted
                                            loop
                                            playsInline
                                        />
                                        <div className="absolute inset-0 rounded-xl bg-black/40" />
                                    </>
                                )}
                                <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-white/10" />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Navigation Arrows */}
            <button
                onClick={handlePrev}
                className="absolute left-4 md:left-10 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 md:p-4 text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 md:h-6 md:w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
            </button>
            <button
                onClick={handleNext}
                className="absolute right-4 md:right-10 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 md:p-4 text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 md:h-6 md:w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
            </button>

            {/* Navigation Dots */}
            <div className="absolute bottom-4 flex gap-2">
                {videos.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-2 w-2 rounded-full transition-all ${idx === currentIndex ? 'w-6 bg-white' : 'bg-white/30'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

export default VideoCarousel;
