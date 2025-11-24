'use client';

import { useState, useCallback } from 'react';
import { VideoUploader } from '@repo/ui/video-uploader';
import { InlineError, useErrorState } from '../../ui/error-banner';

interface SimpleVideoUploadProps {
  onSubmit?: (
    file: File,
    prompt: string,
    onProgress?: (step: 'uploading' | 'scheduling' | null) => void
  ) => Promise<void>;
}

export function VideoUploadForm({ onSubmit }: SimpleVideoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
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

  const handleUploadComplete = useCallback(() => {}, []);

  const handleUploadError = useCallback((error: string) => {
    console.error('Upload error:', error);
  }, []);

  const handleSubmit = useCallback(async () => {
    clearValidationError();

    const errors: string[] = [];

    if (!selectedFile) {
      errors.push('Please select a file');
    }

    if (!prompt.trim()) {
      errors.push('Please enter a prompt');
    } else if (prompt.length > 1000) {
      errors.push('Prompt must be less than 1000 characters');
    }

    if (errors.length > 0) {
      setValidationError(errors.join('; '));
      return;
    }

    if (selectedFile && prompt.trim() && onSubmit) {
      setIsProcessing(true);

      try {
        await onSubmit(selectedFile, prompt.trim());

        setSelectedFile(null);
        setVideoThumbnail(null);
        setPrompt('');
        clearValidationError();
        setIsProcessing(false);
      } catch (error) {
        console.error('Submission failed:', error);
        setIsProcessing(false);
      }
    }
  }, [
    selectedFile,
    prompt,
    onSubmit,
    clearValidationError,
    setValidationError,
  ]);

  const isReady =
    selectedFile && prompt.trim() && !isProcessing && !validationError;

  return (
    <div className="w-full max-w-3xl mx-auto relative">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center space-x-3 mb-2">
          <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-light text-white tracking-tight">
            What can I create for you?
          </h1>
        </div>
      </div>

      <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-300 hover:border-white/20">
        <div className="p-6 border-b border-white/10">
          {videoThumbnail && selectedFile ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="relative group max-w-sm w-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                  <img
                    src={videoThumbnail}
                    alt="Video thumbnail"
                    className={`relative w-full h-auto rounded-2xl shadow-xl ring-1 ring-white/10 transition-opacity duration-300 ${isProcessing ? 'opacity-40' : ''}`}
                  />

                  {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 backdrop-blur-[1px]">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-purple-600/20 rounded-xl blur-md"></div>
                        <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-5 py-3.5 shadow-xl">
                          <div className="flex items-center space-x-3">
                            <div className="relative w-4 h-4">
                              <div className="absolute inset-0 border-2 border-white/20 rounded-full"></div>
                              <div className="absolute inset-0 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
                            </div>
                            <span className="text-white text-sm font-medium">
                              Processing video
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {!isProcessing && (
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setVideoThumbnail(null);
                        clearValidationError();
                      }}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-110"
                    >
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent rounded-b-2xl p-3 pt-8">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                          validationError
                            ? 'bg-red-500/20 ring-1 ring-red-500/40'
                            : 'bg-emerald-500/20 ring-1 ring-emerald-500/40'
                        }`}
                      >
                        {validationError ? (
                          <svg
                            className="w-3.5 h-3.5 text-red-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-3.5 h-3.5 text-emerald-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-medium truncate transition-colors ${validationError ? 'text-red-300' : 'text-white'}`}
                        >
                          {selectedFile.name}
                        </div>
                        <div className="text-xs text-gray-300 mt-0.5">
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {validationError && (
                <div className="max-w-sm mx-auto">
                  <InlineError
                    error={validationError}
                    size="sm"
                    onDismiss={clearValidationError}
                  />
                </div>
              )}
            </div>
          ) : (
            <VideoUploader
              onFileSelect={handleFileSelect}
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              maxSize={100}
              disabled={isProcessing}
              showUploadButton={false}
            />
          )}
        </div>

        <div className="relative group/textarea">
          <div className="relative bg-white/[0.03] rounded-b-lg border-t border-white/5 transition-all duration-300 group-focus-within/textarea:border-white/20 group-focus-within/textarea:bg-white/[0.05]">
            <div className="px-5 pt-4 pb-3">
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (validationError && e.target.value.trim()) {
                    clearValidationError();
                  }
                }}
                placeholder="Describe the music you want for your video..."
                className={`w-full h-28 px-0 py-0 bg-transparent border-0 text-white placeholder-gray-500 focus:outline-none resize-none text-base leading-relaxed transition-colors ${
                  validationError ? 'text-red-300 placeholder-red-400/50' : ''
                }`}
                disabled={isProcessing}
              />
            </div>

            <div className="flex items-center justify-between px-5 pb-4 pt-2 border-t border-white/5">
              <div className="flex items-center space-x-3">
                <div
                  className={`text-xs font-medium transition-colors ${
                    prompt.length > 900
                      ? 'text-orange-400'
                      : prompt.length > 0
                        ? 'text-gray-400'
                        : 'text-gray-600'
                  }`}
                >
                  {prompt.length}/1000
                </div>
                {prompt.length > 0 && (
                  <div className="flex items-center space-x-1.5 text-xs text-gray-500">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                      />
                    </svg>
                    <span>Music prompt</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!isReady || isProcessing}
                className={`group relative h-10 px-6 rounded-full font-medium text-sm transition-all duration-200 overflow-hidden ${
                  isReady && !isProcessing
                    ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:shadow-lg hover:shadow-purple-500/50 hover:scale-105'
                    : 'bg-gray-700 opacity-50 cursor-not-allowed'
                }`}
              >
                {isReady && !isProcessing && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}

                <div className="relative flex items-center space-x-2 text-white">
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                        />
                      </svg>
                      <span>Generate</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {validationError && !selectedFile && (
          <div className="px-6 pb-4 border-t border-white/10">
            <div className="mt-3">
              <InlineError
                error={validationError}
                size="sm"
                onDismiss={clearValidationError}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
