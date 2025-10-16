"use client";

import { useState, useCallback } from "react";
import { VideoUploader, type UploadResult } from "@repo/ui/video-uploader";
import { LiquidGlassCard } from "@repo/ui/liquid-glass-card";
import { GradientButton } from "@repo/ui/gradient-button";

interface VideoUploadInterfaceProps {
  onSubmit?: (file: File, prompt: string) => void;
  className?: string;
}

export function VideoUploadInterface({ onSubmit, className }: VideoUploadInterfaceProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const MAX_PROMPT_LENGTH = 500;

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setUploadResult(null);
  }, []);

  const handleUploadProgress = useCallback((progress: number) => {
    setUploadProgress(progress);
  }, []);

  const handleUploadComplete = useCallback((result: UploadResult) => {
    setUploadResult(result);
    setUploadProgress(0);
  }, []);

  const handleUploadError = useCallback((error: string) => {
    console.error('Upload error:', error);
    setUploadProgress(0);
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedFile && prompt.trim() && uploadResult) {
      setIsProcessing(true);
      
      // Call the onSubmit callback
      onSubmit?.(selectedFile, prompt.trim());
      
      // Reset form after submission
      setTimeout(() => {
        setSelectedFile(null);
        setPrompt("");
        setUploadResult(null);
        setUploadProgress(0);
        setIsProcessing(false);
      }, 1000);
    }
  }, [selectedFile, prompt, uploadResult, onSubmit]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setPrompt("");
    setUploadResult(null);
    setUploadProgress(0);
    setIsProcessing(false);
  }, []);

  const isReadyToSubmit = selectedFile && prompt.trim() && uploadResult && !isProcessing;
  const promptCharCount = prompt.length;
  const isPromptValid = promptCharCount > 0 && promptCharCount <= MAX_PROMPT_LENGTH;

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Video Upload Section */}
        <LiquidGlassCard className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Upload Video</h3>
              {selectedFile && (
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
            
            <VideoUploader
              onFileSelect={handleFileSelect}
              onUploadProgress={handleUploadProgress}
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              maxSize={200} // 200MB limit
              disabled={isProcessing}
            />

            {/* File Preview */}
            {selectedFile && uploadResult && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">
                      {selectedFile.name}
                    </h4>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      <p>Type: {selectedFile.type}</p>
                      <p>Uploaded: {new Date(uploadResult.uploadedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </LiquidGlassCard>

        {/* Prompt Input Section */}
        <LiquidGlassCard className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Music Prompt</h3>
              <div className={`text-sm ${
                promptCharCount > MAX_PROMPT_LENGTH 
                  ? 'text-red-400' 
                  : promptCharCount > MAX_PROMPT_LENGTH * 0.8 
                    ? 'text-yellow-400' 
                    : 'text-gray-400'
              }`}>
                {promptCharCount}/{MAX_PROMPT_LENGTH}
              </div>
            </div>
            
            <div className="space-y-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the type of music you want to generate for your video. Be specific about genre, mood, instruments, tempo, etc."
                className="w-full h-32 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                maxLength={MAX_PROMPT_LENGTH}
                disabled={isProcessing}
              />
              
              {/* Prompt Examples */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Examples:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Upbeat electronic dance music with synthesizers",
                    "Calm acoustic guitar with soft piano",
                    "Epic orchestral soundtrack with dramatic crescendo",
                    "Lo-fi hip hop with vinyl crackle and jazz samples"
                  ].map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setPrompt(example)}
                      className="text-xs px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-full transition-all duration-200 border border-white/10 hover:border-white/20"
                      disabled={isProcessing}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Validation Messages */}
            {prompt && !isPromptValid && (
              <div className="flex items-center space-x-2 text-sm">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400">
                  {promptCharCount === 0 
                    ? "Please enter a music prompt" 
                    : "Prompt is too long"
                  }
                </span>
              </div>
            )}
          </div>
        </LiquidGlassCard>

        {/* Submit Section */}
        <LiquidGlassCard className="p-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Generate Music</h3>
            
            {/* Requirements Checklist */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${selectedFile ? 'bg-green-400' : 'bg-gray-600'}`}>
                  {selectedFile && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${selectedFile ? 'text-green-400' : 'text-gray-400'}`}>
                  Video uploaded
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${uploadResult ? 'bg-green-400' : 'bg-gray-600'}`}>
                  {uploadResult && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${uploadResult ? 'text-green-400' : 'text-gray-400'}`}>
                  Upload completed
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${isPromptValid ? 'bg-green-400' : 'bg-gray-600'}`}>
                  {isPromptValid && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${isPromptValid ? 'text-green-400' : 'text-gray-400'}`}>
                  Music prompt provided
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <GradientButton
                onClick={handleSubmit}
                disabled={!isReadyToSubmit}
                loading={isProcessing}
                size="lg"
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Generate Music'}
              </GradientButton>
              
              {!isReadyToSubmit && !isProcessing && (
                <p className="text-sm text-gray-400 text-center mt-2">
                  Complete all requirements above to generate music
                </p>
              )}
            </div>
          </div>
        </LiquidGlassCard>
      </div>
    </div>
  );
}