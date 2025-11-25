"use client";

import { type JSX, useState, useRef, useCallback } from "react";
import { cn } from "./utils";

export interface UploadResult {
  filename: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface VideoUploaderProps {
  onFileSelect: (file: File) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
  maxSize?: number; // in MB
  acceptedFormats?: string[];
  className?: string;
  disabled?: boolean;
  showUploadButton?: boolean;
}

const DEFAULT_ACCEPTED_FORMATS = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/avi',
  'video/mov',
  'video/quicktime'
];

const DEFAULT_MAX_SIZE = 100; // 100MB

export function VideoUploader({
  onFileSelect,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedFormats = DEFAULT_ACCEPTED_FORMATS,
  className,
  disabled = false,
  showUploadButton = true,
}: VideoUploaderProps): JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedFormats.includes(file.type)) {
      return `Invalid file format. Accepted formats: ${acceptedFormats.map(f => f.split('/')[1]).join(', ')}`;
    }

    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size too large. Maximum size: ${maxSize}MB`;
    }

    return null;
  }, [acceptedFormats, maxSize]);

  const handleFileSelection = useCallback((file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);

    if (!showUploadButton) {
      const result = {
        filename: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      };
      onUploadComplete?.(result);
    }
  }, [validateFile, onFileSelect, showUploadButton, onUploadComplete]);

  const simulateUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setUploadProgress(progress);
        onUploadProgress?.(progress);
      }

      const result = {
        filename: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      };

      onUploadComplete?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadProgress, onUploadComplete, onUploadError]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0]) {
      handleFileSelection(files[0]);
    }
  }, [disabled, isUploading, handleFileSelection]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]) {
      handleFileSelection(files[0]);
    }
  }, [handleFileSelection]);

  const handleClick = useCallback(() => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  }, [disabled, isUploading]);

  const handleUploadClick = useCallback(() => {
    if (selectedFile && !isUploading) {
      simulateUpload(selectedFile);
    }
  }, [selectedFile, isUploading, simulateUpload]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        className={cn(
          "relative liquid-glass-primary p-8 transition-all duration-300 ease-in-out",
          "border-2 border-dashed",
          isDragOver && !disabled && "border-accent-primary bg-accent-primary/10 scale-[1.02]",
          !isDragOver && "border-white/20 hover:border-white/40",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-pointer",
          selectedFile && "border-green-400/50 bg-green-500/5"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300",
            isDragOver ? "bg-accent-primary/20 text-accent-primary" : "bg-white/10 text-white/70"
          )}>
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">
              {selectedFile ? "File Selected" : "Upload Video"}
            </h3>
            <p className="text-sm text-white/60">
              {selectedFile
                ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
                : isDragOver
                  ? "Drop your video file here"
                  : "Drag and drop your video file here, or click to browse"
              }
            </p>
            <p className="text-xs text-white/40">
              Supported formats: {acceptedFormats.map(f => f.split('/')[1]?.toUpperCase() || f).join(', ')} • Max size: {maxSize}MB
            </p>
          </div>
        </div>

        {isDragOver && !disabled && (
          <div className="absolute inset-0 bg-accent-primary/10 backdrop-blur-sm rounded-2xl border-2 border-accent-primary flex items-center justify-center">
            <div className="text-accent-primary font-semibold">Drop to upload</div>
          </div>
        )}
      </div>

      {selectedFile && !isUploading && showUploadButton && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleUploadClick}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl font-medium hover:brightness-110 transition-all duration-300 hover:scale-105"
          >
            Start Upload
          </button>
          <button
            onClick={handleRemoveFile}
            className="px-4 py-2 bg-white/10 text-white/70 rounded-xl font-medium hover:bg-white/20 hover:text-white transition-all duration-300"
          >
            Remove
          </button>
        </div>
      )}

      {selectedFile && !isUploading && !showUploadButton && (
        <div className="mt-4">
          <button
            onClick={handleRemoveFile}
            className="px-4 py-2 bg-white/10 text-white/70 rounded-xl font-medium hover:bg-white/20 hover:text-white transition-all duration-300"
          >
            Remove File
          </button>
        </div>
      )}

      {isUploading && (
        <div className="mt-4 space-y-3">
          <div className="flex justify-between text-sm text-white/70">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-400 text-sm font-medium">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
