import React, { useMemo } from 'react';

export interface MusicalContext {
    type: string;
    data: {
        scene_analysis: Array<{
            description: string;
            mood: string;
            keywords: string[];
            timestamp: number;
            start_time: number;
            end_time: number;
        }>;
        master_plan: {
            global_context: string;
            musical_blocks: Array<{
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
            }>;
        };
    };
}

interface MusicalContextDisplayProps {
    context: MusicalContext | null;
    currentTime: number;
}

// Helper to get current data
const useCurrentContext = (context: MusicalContext | null, currentTime: number) => {
    return useMemo(() => {
        if (!context?.data) return { currentBlock: null, currentScene: null };

        const currentBlock = context.data.master_plan.musical_blocks.find(
            block => currentTime >= block.time_range.start && currentTime < block.time_range.end
        );

        const currentScene = context.data.scene_analysis.find(
            scene => currentTime >= scene.start_time && currentTime < scene.end_time
        );

        return { currentBlock, currentScene };
    }, [context, currentTime]);
};

// Animation Styles
const animationStyles = `
  @keyframes equalizer {
    0% { height: 20%; }
    50% { height: 100%; }
    100% { height: 20%; }
  }
  @keyframes slideFade {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-equalizer {
    animation: equalizer 0.8s ease-in-out infinite;
  }
  .animate-slideFade {
    animation: slideFade 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }
`;

export function TopContextBar({ context, currentTime }: MusicalContextDisplayProps) {
    const { currentScene } = useCurrentContext(context, currentTime);

    if (!context) return null;

    return (
        <div className="w-full bg-black/40 backdrop-blur-md border-b border-white/10 px-6 py-3 flex items-center justify-between gap-8">
            <style>{animationStyles}</style>
            {/* Global Theme (Left) */}
            <div className="flex items-center gap-4 shrink-0 max-w-md">
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Global Theme</span>
                </div>
                <p className="text-white/80 text-xs font-light tracking-wide truncate">
                    {context.data.master_plan.global_context}
                </p>
            </div>

            {/* Scene Info (Right) */}
            {currentScene ? (
                <div className="flex items-center gap-6 flex-grow justify-end min-w-0">
                    {/* Mood Badge */}
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400/60">Scene</span>
                        <div key={currentScene.mood} className="animate-slideFade px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-200 text-[10px] font-mono border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                            {currentScene.mood}
                        </div>
                    </div>

                    {/* Description */}
                    <div key={currentScene.description} className="animate-slideFade text-white/70 text-xs font-light italic truncate max-w-xl">
                        "{currentScene.description}"
                    </div>

                    {/* Keywords */}
                    <div className="hidden xl:flex gap-2 shrink-0">
                        {currentScene.keywords.slice(0, 3).map((keyword, idx) => (
                            <span key={`${keyword}-${idx}`} className="animate-slideFade text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-mono" style={{ animationDelay: `${idx * 0.1}s` }}>
                                #{keyword}
                            </span>
                        ))}
                    </div>
                </div>
            ) : (
                <span className="text-white/30 text-xs">Waiting for scene...</span>
            )}
        </div>
    );
}

export function MusicalBlockBar({ context, currentTime }: MusicalContextDisplayProps) {
    const { currentBlock } = useCurrentContext(context, currentTime);

    if (!context) return null;

    return (
        <div className="w-full bg-black/60 backdrop-blur-xl border-t border-white/10 p-4">
            <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-8 items-center">

                {/* 1. Status / Time */}
                <div className="col-span-2 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${currentBlock ? 'bg-green-500 animate-[pulse_1s_ease-in-out_infinite] shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-white/20'}`} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                            {currentBlock ? 'LIVE BLOCK' : 'STANDBY'}
                        </span>
                    </div>
                    {currentBlock && (
                        <span className="text-[10px] font-mono text-white/30">
                            {currentBlock.time_range.start.toFixed(1)}s - {currentBlock.time_range.end.toFixed(1)}s
                        </span>
                    )}
                </div>

                {/* 2. Main Direction (Small Text) */}
                <div className="col-span-5 border-l border-white/10 pl-8">
                    {currentBlock ? (
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-purple-400/60 mb-1">Musical Direction</span>
                            <div key={currentBlock.musical_direction} className="animate-slideFade text-sm font-medium text-white/90 tracking-wide">
                                {currentBlock.musical_direction}
                            </div>
                        </div>
                    ) : (
                        <span className="text-xs text-white/20">Waiting for musical cues...</span>
                    )}
                </div>

                {/* 3. Metrics */}
                <div className="col-span-2 border-l border-white/10 pl-8 flex gap-8">
                    {currentBlock && (
                        <>
                            <div>
                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1">BPM</div>
                                <div key={currentBlock.lyria_config.bpm} className="animate-slideFade text-sm font-mono text-white">{currentBlock.lyria_config.bpm}</div>
                            </div>
                            <div>
                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1">Scale</div>
                                <div key={currentBlock.lyria_config.scale} className="animate-slideFade text-sm font-mono text-white truncate max-w-[100px]">
                                    {currentBlock.lyria_config.scale.replace(/_/g, ' ')}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* 4. Visualizer (Replaces Transition for more "coolness" or sits next to it) */}
                <div className="col-span-3 border-l border-white/10 pl-8 flex items-center justify-between">
                    {currentBlock && (
                        <div className="flex flex-col mr-4 min-w-0 flex-1">
                            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1">Transition</div>
                            <div key={currentBlock.transition} className="animate-slideFade text-xs text-white/60 italic truncate">
                                "{currentBlock.transition}"
                            </div>
                        </div>
                    )}

                    {/* Visualizer Bars */}
                    <div className="flex gap-0.5 items-end h-6 shrink-0">
                        {currentBlock ? (
                            [...Array(12)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-[1px] animate-equalizer opacity-80"
                                    style={{
                                        animationDuration: `${0.6 + Math.random() * 0.6}s`,
                                        animationDelay: `${Math.random() * -1}s`
                                    }}
                                />
                            ))
                        ) : (
                            <div className="h-px w-20 bg-white/10" />
                        )}
                    </div>
                </div>
            </div>

            {/* Timeline Track */}
            <div className="w-full h-0.5 bg-white/5 mt-4 rounded-full overflow-hidden flex gap-px">
                {context.data.master_plan.musical_blocks.map((block, idx) => {
                    const isActive = currentBlock === block;
                    return (
                        <div
                            key={idx}
                            className={`flex-1 transition-all duration-300 ${isActive ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]' : 'bg-white/5'}`}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// Default export for backward compatibility
export function MusicalContextDisplay(props: MusicalContextDisplayProps) {
    return (
        <div className="flex flex-col gap-4">
            <TopContextBar {...props} />
            <MusicalBlockBar {...props} />
        </div>
    );
}
