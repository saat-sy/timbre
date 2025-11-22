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
    if (!context) return null;

    return (
        <div className="max-w-3xl mx-auto bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl px-6 py-3 flex items-center justify-center shadow-lg">
            <style>{animationStyles}</style>
            {/* Global Theme Only - Boxed & Wrappable */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 shrink-0 self-start mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Global Theme</span>
                </div>
                <p className="text-white/90 text-sm font-light tracking-wide leading-relaxed line-clamp-2">
                    {context.data.master_plan.global_context}
                </p>
            </div>
        </div>
    );
}

export function MusicalBlockBar({ context, currentTime }: MusicalContextDisplayProps) {
    const { currentBlock } = useCurrentContext(context, currentTime);

    // Generate dynamic tint color based on musical direction
    const getTintStyle = (direction: string) => {
        let hash = 0;
        for (let i = 0; i < direction.length; i++) {
            hash = direction.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        return {
            background: `linear-gradient(135deg, hsla(${hue}, 70%, 50%, 0.15) 0%, rgba(0,0,0,0) 100%)`,
            borderColor: `hsla(${hue}, 70%, 50%, 0.3)`
        };
    };

    const tintStyle = currentBlock ? getTintStyle(currentBlock.musical_direction) : {};

    if (!context) return null;

    return (
        <div
            className="w-full max-w-5xl mx-auto bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-colors duration-1000"
            style={currentBlock ? { borderColor: tintStyle.borderColor } : {}}
        >
            {/* Dynamic Tint Background */}
            {currentBlock && (
                <div
                    className="absolute inset-0 opacity-50 transition-all duration-1000"
                    style={{ background: tintStyle.background }}
                />
            )}

            <div className="grid grid-cols-12 gap-8 items-center relative z-10">

                {/* 1. Status / Time */}
                <div className="col-span-2 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${currentBlock ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-white/20'}`} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                            {currentBlock ? 'LIVE' : 'STANDBY'}
                        </span>
                    </div>
                    {currentBlock && (
                        <span className="text-[10px] font-mono text-white/30">
                            {currentBlock.time_range.start.toFixed(1)}s - {currentBlock.time_range.end.toFixed(1)}s
                        </span>
                    )}
                </div>

                {/* 2. Main Direction (Cooler Typography) */}
                <div className="col-span-5 border-l border-white/10 pl-8">
                    {currentBlock ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-purple-400/60">Musical Direction</span>
                            <div key={currentBlock.musical_direction} className="animate-slideFade text-xl font-medium text-white tracking-wide leading-tight drop-shadow-sm">
                                {currentBlock.musical_direction}
                            </div>
                        </div>
                    ) : (
                        <span className="text-sm text-white/20">Waiting for musical cues...</span>
                    )}
                </div>

                {/* 3. Metrics (HUD Style) */}
                <div className="col-span-2 border-l border-white/10 pl-8 flex gap-8">
                    {currentBlock && (
                        <>
                            <div>
                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1">BPM</div>
                                <div key={currentBlock.lyria_config.bpm} className="animate-slideFade text-lg font-mono text-white/90">{currentBlock.lyria_config.bpm}</div>
                            </div>
                            <div>
                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1">Scale</div>
                                <div key={currentBlock.lyria_config.scale} className="animate-slideFade text-lg font-mono text-white/90 truncate max-w-[100px]">
                                    {currentBlock.lyria_config.scale.replace(/_/g, ' ')}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* 4. Transition (Clean, No Visualizer) */}
                <div className="col-span-3 border-l border-white/10 pl-8 flex items-center justify-between">
                    {currentBlock && (
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1">Transition</div>
                            <div key={currentBlock.transition} className="animate-slideFade text-sm text-white/60 italic truncate">
                                "{currentBlock.transition}"
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Timeline Track (Integrated) */}
            <div className="w-full h-0.5 bg-white/5 mt-6 rounded-full overflow-hidden flex gap-px opacity-50">
                {context.data.master_plan.musical_blocks.map((block, idx) => {
                    const isActive = currentBlock === block;
                    return (
                        <div
                            key={idx}
                            className={`flex-1 transition-all duration-300 ${isActive ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]' : 'bg-white/10'}`}
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
