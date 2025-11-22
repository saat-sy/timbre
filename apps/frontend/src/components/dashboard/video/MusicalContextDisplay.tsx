import React, { useMemo } from 'react';

export interface MusicalBlock {
    time_range: {
        start: number;
        end: number;
    };
    musical_direction: string;
    transition: string;
    lyria_config: {
        prompt: string;
        bpm: number;
        scale: string;
        weight: number;
    };
}

export interface MusicalContext {
    global_context: string;
    musical_blocks: MusicalBlock[];
}

interface MusicalContextDisplayProps {
    context: MusicalContext | null;
    currentTime: number;
}

export function MusicalContextDisplay({ context, currentTime }: MusicalContextDisplayProps) {
    const currentBlock = useMemo(() => {
        if (!context) return null;
        return context.musical_blocks.find(
            block => currentTime >= block.time_range.start && currentTime < block.time_range.end
        );
    }, [context, currentTime]);

    if (!context) return null;

    return (
        <div className="w-full max-w-md flex flex-col gap-4 p-4">
            {/* Global Context Card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">Global Theme</h3>
                <p className="text-white/90 text-sm leading-relaxed font-light">
                    {context.global_context}
                </p>
            </div>

            {/* Active Block Display */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-2xl transition-all duration-500">
                {currentBlock ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-4">
                            <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-xs font-mono border border-purple-500/30">
                                {currentBlock.time_range.start.toFixed(1)}s - {currentBlock.time_range.end.toFixed(1)}s
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-xs text-green-400 font-medium uppercase tracking-wide">Active</span>
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-white mb-3 leading-tight">
                            {currentBlock.musical_direction}
                        </h2>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-black/20 rounded-lg p-3">
                                <div className="text-xs text-white/50 uppercase tracking-wider mb-1">BPM</div>
                                <div className="text-lg font-mono text-white">{currentBlock.lyria_config.bpm}</div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-3">
                                <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Scale</div>
                                <div className="text-lg font-mono text-white truncate" title={currentBlock.lyria_config.scale}>
                                    {currentBlock.lyria_config.scale}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Transition</div>
                                <div className="text-sm text-white/80 italic">"{currentBlock.transition}"</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-white/30">
                        <div className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center mb-3">
                            <span className="block w-2 h-2 bg-white/30 rounded-full" />
                        </div>
                        <p className="text-sm font-light">Waiting for musical cues...</p>
                    </div>
                )}
            </div>

            {/* Timeline Preview (Optional - can be added later for more detail) */}
            <div className="mt-2 flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-white/5">
                {context.musical_blocks.map((block, idx) => {
                    const isActive = currentBlock === block;
                    // This is a simplified width calculation. Ideally, we'd map time to width percentage.
                    // For now, just equal width or based on duration if we had total duration easily accessible here.
                    // Let's just make them equal for visual indication or maybe flex-grow based on duration if possible.
                    // Since we don't have total duration passed easily to this specific sub-component without calculation,
                    // we'll just use flex-1 for now to show the sequence.
                    return (
                        <div
                            key={idx}
                            className={`flex-1 transition-all duration-300 ${isActive ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-white/10'}`}
                        />
                    );
                })}
            </div>
        </div>
    );
}
