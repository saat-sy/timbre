import { useEffect, useRef, useState, useCallback } from 'react';
import { processAudioChunk } from './audioUtils';

interface AudioStreamConfig {
    prompt: string;
    bpm: number;
    scale: string;
    weight: string;
    context: string;
    transcription: Record<string, unknown>;
    temp_video_path: string;
}

interface UseAudioStreamProps {
    videoDuration: number;
    onStop?: () => void;
    initialPaused?: boolean;
}

export function useAudioStream({ videoDuration, onStop, initialPaused = false }: UseAudioStreamProps) {
    const audioContextRef = useRef<AudioContext | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const totalBufferedDurationRef = useRef<number>(0);
    const isPlayingRef = useRef<boolean>(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        if (initialPaused && audioContextRef.current.state === 'running') {
            audioContextRef.current.suspend();
        }
        return () => {
            audioContextRef.current?.close();
        };
    }, [initialPaused]);

    const videoDurationRef = useRef(videoDuration);

    useEffect(() => {
        videoDurationRef.current = videoDuration;
    }, [videoDuration]);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        console.log('Connecting to WebSocket...');

        // Reset state for new connection
        totalBufferedDurationRef.current = 0;
        nextStartTimeRef.current = 0;

        const ws = new WebSocket('ws://localhost:8000/ws/music');
        wsRef.current = ws;
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            console.log('WebSocket connected');
            const initialMessage: AudioStreamConfig = {
                prompt: "heavy piano",
                bpm: 120,
                scale: "C_MAJOR_A_MINOR",
                weight: "1.0",
                context: "dummy",
                transcription: {
                    "dum": "my",
                },
                temp_video_path: "custom_dummy"
            };
            ws.send(JSON.stringify(initialMessage));
        };

        ws.onmessage = async (event) => {
            if (typeof event.data === 'string') {
                console.log('Received string message:', event.data);
                if (event.data === 'PLAYING') {
                    setIsReady(true);
                }
                return;
            }

            if (event.data instanceof ArrayBuffer) {
                const audioContext = audioContextRef.current;
                if (!audioContext) return;

                const audioBuffer = processAudioChunk(audioContext, event.data);

                // Schedule playback
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);

                // Calculate start time
                // If nextStartTime is in the past (due to lag/startup), reset to currentTime
                const currentTime = audioContext.currentTime;
                const startTime = Math.max(nextStartTimeRef.current, currentTime);

                source.start(startTime);

                nextStartTimeRef.current = startTime + audioBuffer.duration;
                totalBufferedDurationRef.current += audioBuffer.duration;

                const currentVideoDuration = videoDurationRef.current;
                if (currentVideoDuration > 0 && totalBufferedDurationRef.current >= currentVideoDuration) {
                    console.log('Video duration reached, sending STOP');
                    ws.send(JSON.stringify({ command: "STOP" }));
                    ws.close();
                    onStop?.();
                }
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket closed');
            setIsReady(false);
        };

    }, [onStop]);

    const play = useCallback(() => {
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        isPlayingRef.current = true;
        // If not connected, connect now
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.log('Play called but WebSocket not ready, connecting...');
            connect();
        }
    }, [connect]);

    const pause = useCallback(() => {
        if (audioContextRef.current?.state === 'running') {
            audioContextRef.current.suspend();
        }
        isPlayingRef.current = false;
    }, []);

    const stop = useCallback(() => {
        wsRef.current?.close();
        wsRef.current = null;
        audioContextRef.current?.close();
        isPlayingRef.current = false;
        setIsReady(false);
        nextStartTimeRef.current = 0;
        totalBufferedDurationRef.current = 0;
    }, []);

    return {
        play,
        pause,
        stop,
        isReady
    };
}
