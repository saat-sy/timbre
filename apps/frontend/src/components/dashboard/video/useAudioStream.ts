import { useEffect, useRef, useState, useCallback } from 'react';
import { processAudioChunk } from './audioUtils';
import { MusicalContext } from './MusicalContextDisplay';

interface UseAudioStreamProps {
    videoDuration: number;
    onStop?: () => void;
    initialPaused?: boolean;
    sessionId: string;
}

interface AudioChunk {
    buffer: AudioBuffer;
    startTime: number;
    duration: number;
}

export function useAudioStream({ videoDuration, onStop, initialPaused = false, sessionId }: UseAudioStreamProps) {
    const audioContextRef = useRef<AudioContext | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const audioChunksRef = useRef<AudioChunk[]>([]);
    const totalBufferedDurationRef = useRef<number>(0);

    // Playback state
    const isPlayingRef = useRef<boolean>(false);
    const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const isBufferingRef = useRef<boolean>(false);

    // Time tracking
    const currentMediaTimeRef = useRef<number>(0);
    const playbackAnchorRef = useRef<{ contextTime: number, mediaTime: number } | null>(null);

    const [isReady, setIsReady] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [bufferedDuration, setBufferedDuration] = useState(0);

    const [musicalContext, setMusicalContext] = useState<MusicalContext | null>(null);

    const videoDurationRef = useRef(videoDuration);

    useEffect(() => {
        videoDurationRef.current = videoDuration;
    }, [videoDuration]);

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

    useEffect(() => {
        let animationFrameId: number;

        const checkBuffer = () => {
            if (isPlayingRef.current && !isBufferingRef.current && audioContextRef.current && playbackAnchorRef.current) {
                const { contextTime, mediaTime } = playbackAnchorRef.current;
                const currentTime = audioContextRef.current.currentTime;
                const currentMediaTime = mediaTime + (currentTime - contextTime);

                // Update current media time ref for other uses
                currentMediaTimeRef.current = currentMediaTime;

                // Check for underrun
                // Threshold: 0.2s to avoid glitching
                if (totalBufferedDurationRef.current < videoDurationRef.current &&
                    totalBufferedDurationRef.current - currentMediaTime < 0.2) {

                    console.log('Buffer underrun, buffering...');
                    isBufferingRef.current = true;
                    setIsBuffering(true);

                    // Suspend context to pause "time"
                    if (audioContextRef.current.state === 'running') {
                        audioContextRef.current.suspend();
                    }
                }
            }
            animationFrameId = requestAnimationFrame(checkBuffer);
        };

        animationFrameId = requestAnimationFrame(checkBuffer);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    const stopAllSources = useCallback(() => {
        activeSourcesRef.current.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Ignore
            }
        });
        activeSourcesRef.current.clear();
    }, []);

    const schedulePlayback = useCallback(() => {
        const audioContext = audioContextRef.current;
        if (!audioContext || !playbackAnchorRef.current) return;

        const { contextTime: anchorContextTime, mediaTime: anchorMediaTime } = playbackAnchorRef.current;
        const currentContextTime = audioContext.currentTime;

        audioChunksRef.current.forEach(chunk => {
            // Calculate start time in context coordinates
            const startTimeInContext = anchorContextTime + (chunk.startTime - anchorMediaTime);
            const endTimeInContext = startTimeInContext + chunk.duration;

            // If chunk is completely in the past, ignore
            if (endTimeInContext <= currentContextTime) return;

            let offset = 0;
            let start = startTimeInContext;
            let duration = chunk.duration;

            if (startTimeInContext < currentContextTime) {
                // Partial playback for currently playing chunk
                offset = currentContextTime - startTimeInContext;
                start = currentContextTime;
                duration = chunk.duration - offset;
            }

            const source = audioContext.createBufferSource();
            source.buffer = chunk.buffer;
            source.connect(audioContext.destination);
            source.start(start, offset, duration);

            activeSourcesRef.current.add(source);
            source.onended = () => {
                activeSourcesRef.current.delete(source);
            };
        });
    }, []);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        console.log('Connecting to WebSocket...');

        // Reset state for new connection
        totalBufferedDurationRef.current = 0;
        audioChunksRef.current = [];

        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/music';
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            console.log('WebSocket connected');
            if (sessionId) {
                ws.send(JSON.stringify({ session_id: sessionId }));
            } else {
                console.error('No session ID provided to useAudioStream');
                ws.close();
            }
        };

        ws.onmessage = async (event) => {
            if (typeof event.data === 'string') {
                console.log('Received string message:', event.data);
                if (event.data === 'PLAYING') {
                    setIsReady(true);
                    return;
                }

                try {
                    const parsedData = JSON.parse(event.data);

                    if (parsedData.command === 'heartbeat') {
                        ws.send(JSON.stringify({ command: 'heartbeat_ack' }));
                        return;
                    }

                    if (parsedData.type === 'session_data' && parsedData.data) {
                        console.log('Received session data:', parsedData.data);
                        setMusicalContext(parsedData as MusicalContext);
                    } else if (parsedData.global_context && parsedData.musical_blocks) {
                        // Fallback for old format if any
                        console.log('Received legacy musical context:', parsedData);
                        setMusicalContext({
                            type: 'session_data',
                            data: {
                                master_plan: parsedData,
                                scene_analysis: []
                            }
                        });
                    }
                } catch (e) {
                    // Not JSON or not the message we expect
                }
                return;
            }

            if (event.data instanceof ArrayBuffer) {
                const audioContext = audioContextRef.current;
                if (!audioContext) return;

                const audioBuffer = processAudioChunk(audioContext, event.data);

                // Store chunk
                const chunkStartTime = totalBufferedDurationRef.current;
                const chunk: AudioChunk = {
                    buffer: audioBuffer,
                    startTime: chunkStartTime,
                    duration: audioBuffer.duration
                };
                audioChunksRef.current.push(chunk);
                totalBufferedDurationRef.current += audioBuffer.duration;
                setBufferedDuration(totalBufferedDurationRef.current);

                if (isPlayingRef.current) {
                    if (isBufferingRef.current) {
                        const bufferedAhead = totalBufferedDurationRef.current - currentMediaTimeRef.current;
                        if (bufferedAhead > 1.0 || totalBufferedDurationRef.current >= videoDurationRef.current) {
                            console.log('Buffer filled, resuming...');
                            isBufferingRef.current = false;
                            setIsBuffering(false);

                            if (audioContext.state === 'suspended') {
                                audioContext.resume();
                            }
                        }
                    }

                    if (playbackAnchorRef.current) {
                        const { contextTime: anchorContextTime, mediaTime: anchorMediaTime } = playbackAnchorRef.current;
                        const startTimeInContext = anchorContextTime + (chunk.startTime - anchorMediaTime);

                        if (startTimeInContext + chunk.duration > audioContext.currentTime) {
                            const source = audioContext.createBufferSource();
                            source.buffer = chunk.buffer;
                            source.connect(audioContext.destination);

                            let start = startTimeInContext;
                            let offset = 0;
                            let duration = chunk.duration;

                            if (start < audioContext.currentTime) {
                                offset = audioContext.currentTime - start;
                                start = audioContext.currentTime;
                                duration -= offset;
                            }

                            source.start(start, offset, duration);
                            activeSourcesRef.current.add(source);
                            source.onended = () => activeSourcesRef.current.delete(source);
                        }
                    }
                }

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
        };

    }, [onStop]);

    const seek = useCallback((time: number) => {
        if (!audioContextRef.current) return;

        console.log(`Seeking to ${time}`);

        currentMediaTimeRef.current = time;

        // Reset buffering state on seek
        isBufferingRef.current = false;
        setIsBuffering(false);

        if (isPlayingRef.current) {
            stopAllSources();

            playbackAnchorRef.current = {
                contextTime: audioContextRef.current.currentTime,
                mediaTime: time
            };

            schedulePlayback();
        }
    }, [schedulePlayback, stopAllSources]);

    const play = useCallback(() => {
        if (!audioContextRef.current) return;

        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        isPlayingRef.current = true;

        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            if (audioChunksRef.current.length === 0) {
                console.log('Play called but WebSocket not ready, connecting...');
                connect();
                return;
            }
        }

        playbackAnchorRef.current = {
            contextTime: audioContextRef.current.currentTime,
            mediaTime: currentMediaTimeRef.current
        };

        schedulePlayback();

    }, [connect, schedulePlayback]);

    const pause = useCallback(() => {
        if (!audioContextRef.current) return;

        if (playbackAnchorRef.current) {
            const elapsed = audioContextRef.current.currentTime - playbackAnchorRef.current.contextTime;
            currentMediaTimeRef.current = playbackAnchorRef.current.mediaTime + elapsed;
        }

        if (audioContextRef.current.state === 'running') {
            audioContextRef.current.suspend();
        }

        stopAllSources();
        isPlayingRef.current = false;
        playbackAnchorRef.current = null;

        // Reset buffering state
        isBufferingRef.current = false;
        setIsBuffering(false);
    }, [stopAllSources]);

    const stop = useCallback(() => {
        wsRef.current?.close();
        wsRef.current = null;
        audioContextRef.current?.close();
        isPlayingRef.current = false;
        setIsReady(false);

        stopAllSources();
        audioChunksRef.current = [];
        totalBufferedDurationRef.current = 0;
        currentMediaTimeRef.current = 0;
        playbackAnchorRef.current = null;

        isBufferingRef.current = false;
        setIsBuffering(false);
        setMusicalContext(null);
    }, [stopAllSources]);

    return {
        play,
        pause,
        stop,
        seek,
        isReady,
        isBuffering,
        bufferedDuration,
        musicalContext
    };
}

