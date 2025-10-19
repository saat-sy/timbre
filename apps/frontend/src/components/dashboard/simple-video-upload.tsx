"use client";

import { useState, useCallback } from "react";
import { VideoUploader, type UploadResult } from "@repo/ui/video-uploader";
import { GradientButton } from "@repo/ui/gradient-button";

interface SimpleVideoUploadProps {
    onSubmit?: (file: File, prompt: string) => Promise<void>;
}

export function SimpleVideoUpload({ onSubmit }: SimpleVideoUploadProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState("");
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);

    const handleFileSelect = useCallback((file: File) => {
        setSelectedFile(file);
        setUploadResult(null);
    }, []);

    const handleUploadComplete = useCallback((result: UploadResult) => {
        setUploadResult(result);
    }, []);

    const handleUploadError = useCallback((error: string) => {
        console.error('Upload error:', error);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (selectedFile && prompt.trim() && uploadResult && onSubmit) {
            setIsProcessing(true);
            setHasSubmitted(true);
            
            try {
                await onSubmit(selectedFile, prompt.trim());
                
                // Reset form after successful submission
                setSelectedFile(null);
                setPrompt("");
                setUploadResult(null);
                setIsProcessing(false);
                setHasSubmitted(false);
            } catch (error) {
                console.error('Submission failed:', error);
                setIsProcessing(false);
                setHasSubmitted(false);
                // Error handling is done in the parent component
            }
        }
    }, [selectedFile, prompt, uploadResult, onSubmit]);

    const isReady = selectedFile && prompt.trim() && uploadResult && !isProcessing;
    const showFixedChat = hasSubmitted || isProcessing;

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Header with icon next to text */}
            <div className="text-center mb-12">
                <div className="flex items-center justify-center space-x-4 mb-8">
                    {/* Gradient icon next to heading */}
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-400 via-red-400 to-purple-600 rounded-xl">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    
                    {/* Smaller heading */}
                    <h1 className="text-3xl font-normal text-white">
                        What can I create for you today?
                    </h1>
                </div>
            </div>

            {/* Connected upload and text area */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {/* Video Upload Area */}
                <div className="p-8 border-b border-white/10">
                    <VideoUploader
                        onFileSelect={handleFileSelect}
                        onUploadComplete={handleUploadComplete}
                        onUploadError={handleUploadError}
                        maxSize={200}
                        disabled={isProcessing}
                    />
                </div>

                {/* File preview inside connected area */}
                {selectedFile && uploadResult && (
                    <div className="px-8 py-4 bg-white/5 border-b border-white/10">
                        <div className="flex items-center justify-center space-x-3">
                            <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="text-white text-sm font-medium">{selectedFile.name}</span>
                        </div>
                    </div>
                )}

                {/* Text input - connected to upload area */}
                {!showFixedChat && (
                    <div className="relative p-8">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the music you want for your video..."
                            className="w-full h-24 px-0 py-0 bg-transparent border-0 text-white placeholder-gray-500 focus:outline-none resize-none text-base leading-relaxed"
                            disabled={isProcessing}
                        />
                        
                        {/* Send button - positioned like Claude */}
                        <div className="absolute bottom-4 right-4">
                            <GradientButton
                                onClick={handleSubmit}
                                disabled={!isReady}
                                loading={isProcessing}
                                className="w-8 h-8 rounded-lg p-0 flex items-center justify-center"
                            >
                                {isProcessing ? (
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                )}
                            </GradientButton>
                        </div>
                        

                    </div>
                )}
            </div>

            {/* Fixed Chat Bar - Only After Submission */}
            {showFixedChat && (
                <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 p-6 z-50">
                    <div className="max-w-4xl mx-auto relative">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the music you want..."
                            className="w-full h-20 px-6 py-4 pr-16 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all resize-none"
                            disabled={isProcessing}
                        />
                        
                        <div className="absolute bottom-4 right-4">
                            <GradientButton
                                onClick={handleSubmit}
                                disabled={!isReady}
                                loading={isProcessing}
                                className="w-10 h-10 rounded-xl p-0 flex items-center justify-center"
                            >
                                {isProcessing ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                )}
                            </GradientButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}