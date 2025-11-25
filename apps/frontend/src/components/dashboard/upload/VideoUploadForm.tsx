'use client';

import { useState, useCallback } from 'react';
import { VideoUploader } from '@/components/ui';
import { InlineError, useErrorState } from '../../ui/error-banner';

interface SimpleVideoUploadProps {
  onSubmit?: (
    file: File,
    onProgress?: (step: 'uploading' | 'scheduling' | null) => void
  ) => Promise<void>;
}

export function VideoUploadForm({ onSubmit }: SimpleVideoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    error: validationError,
    showError: setValidationError,
    clearError: clearValidationError,
  } = useErrorState();

  const generateThumbnail = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration * 0.1);
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(thumbnailUrl);
        } else {
          reject(new Error('Failed to get canvas context'));
        }

        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video'));
        URL.revokeObjectURL(video.src);
      };

      video.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setSelectedFile(file);
      clearValidationError();

      const errors: string[] = [];
      const maxSize = 100 * 1024 * 1024;

      if (file.size > maxSize) {
        errors.push('File size must be less than 100MB');
      }

      if (!file.type.startsWith('video/')) {
        errors.push('Only video files are supported');
      }

      if (errors.length > 0) {
        setValidationError(errors.join('; '));
        setVideoThumbnail(null);
      } else {
        try {
          const thumbnail = await generateThumbnail(file);
          setVideoThumbnail(thumbnail);
        } catch (error) {
          console.error('Failed to generate thumbnail:', error);
          setVideoThumbnail(null);
        }
      }
    },
    [clearValidationError, setValidationError, generateThumbnail]
  );

  const handleUploadComplete = useCallback(() => { }, []);

  const handleUploadError = useCallback((error: string) => {
    console.error('Upload error:', error);
  }, []);

  const handleSubmit = useCallback(async () => {
    clearValidationError();

    const errors: string[] = [];

    if (!selectedFile) {
      errors.push('Please select a file');
    }

    if (errors.length > 0) {
      setValidationError(errors.join('; '));
      return;
    }

    if (selectedFile && onSubmit) {
      setIsProcessing(true);

      try {
        await onSubmit(selectedFile);

        setSelectedFile(null);
        setVideoThumbnail(null);
        clearValidationError();
        setIsProcessing(false);
      } catch (error) {
        console.error('Submission failed:', error);
        setIsProcessing(false);
      }
    }
  }, [
    selectedFile,
    onSubmit,
    clearValidationError,
    setValidationError,
  ]);

  const isReady = selectedFile && !isProcessing && !validationError;

  return (
    <div className="h-full w-full flex items-center justify-center relative px-4 py-8 overflow-hidden">
      {/* Background Ambience - positioned relative to viewport */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-accent-secondary/20 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/2 -translate-y-1/2"></div>
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-accent-primary/20 rounded-full blur-[100px] pointer-events-none transform translate-x-1/2 translate-y-1/2"></div>
      
      <div className="w-full max-w-4xl relative z-10">

      <div className="text-center mb-12 relative z-10">
        <h1 className="text-5xl md:text-6xl font-extralight text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70 tracking-tight mb-4 drop-shadow-sm leading-tight py-2">
          Create Magic
        </h1>
        <p className="text-lg text-white/50 font-light tracking-wide">
          Upload your video and let the AI compose the perfect soundtrack
        </p>
      </div>

      <div className="relative z-10">
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/50 transition-all duration-500 hover:border-white/20 hover:shadow-accent-primary/10 group">

          {/* Main Content Area */}
          <div className="p-8 md:p-12">
            {videoThumbnail && selectedFile ? (
              <div className="space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-center">
                  <div className="relative max-w-2xl w-full aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group-hover:ring-white/20 transition-all">
                    <img
                      src={videoThumbnail}
                      alt="Video thumbnail"
                      className={`w-full h-full object-cover transition-all duration-700 ${isProcessing ? 'scale-105 blur-sm opacity-50' : 'group-hover:scale-105'}`}
                    />

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                    {/* File Info Badge */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                        <span className="text-sm font-medium text-white truncate max-w-[200px]">{selectedFile.name}</span>
                        <span className="text-xs text-white/50 border-l border-white/20 pl-3">
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                    </div>

                    {/* Remove Button */}
                    {!isProcessing && (
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setVideoThumbnail(null);
                          clearValidationError();
                        }}
                        className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 group/btn"
                      >
                        <svg className="w-5 h-5 text-white/70 group-hover/btn:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}

                    {/* Processing State Overlay */}
                    {isProcessing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="relative w-20 h-20 mb-4">
                          <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-transparent border-t-white rounded-full animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                          </div>
                        </div>
                        <span className="text-lg font-light text-white tracking-widest uppercase animate-pulse">Composing...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={!isReady || isProcessing}
                    className={`
                      relative group overflow-hidden rounded-full px-12 py-4 transition-all duration-300
                      ${isReady && !isProcessing
                        ? 'bg-white text-black hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]'
                        : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'}
                    `}
                  >
                    {isReady && !isProcessing && (
                      <div className="absolute inset-0 bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                    )}
                    <span className="relative flex items-center space-x-3 text-lg font-medium tracking-wide">
                      {isProcessing ? (
                        <span>Processing Video...</span>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Generate Music</span>
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12">
                <VideoUploader
                  onFileSelect={handleFileSelect}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  maxSize={100}
                  disabled={isProcessing}
                  showUploadButton={false}
                />
                <div className="mt-8 text-center">
                  <p className="text-white/30 text-sm font-light">Supported formats: MP4, MOV, WEBM • Max size: 100MB</p>
                </div>
              </div>
            )}

            {validationError && (
              <div className="mt-6 flex justify-center animate-in slide-in-from-bottom-2">
                <InlineError
                  error={validationError}
                  size="sm"
                  onDismiss={clearValidationError}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
