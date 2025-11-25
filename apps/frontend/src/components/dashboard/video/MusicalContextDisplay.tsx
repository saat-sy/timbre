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
        <div className="relative max-w-4xl mx-auto group/theme">
            <style>{animationStyles}</style>
            
            {/* Collapsed State */}
            <div className="bg-gradient-to-r from-black/70 via-black/60 to-black/70 backdrop-blur-xl border border-white/10 rounded-xl px-5 py-2.5 flex items-center justify-center shadow-xl relative overflow-hidden cursor-pointer">
                {/* Animated Background Accent */}
                <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/5 via-accent-secondary/5 to-accent-primary/5 opacity-50 group-hover/theme:opacity-70 transition-opacity" />
                
                {/* Content */}
                <div className="flex items-center gap-4 relative z-10 w-full">
                    <div className="flex items-center gap-2 shrink-0 self-start mt-0.5">
                        <div className="relative">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse shadow-[0_0_10px_rgba(255,85,0,0.8)]" />
                            <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-accent-primary animate-ping opacity-75" />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">Global Theme</span>
                    </div>
                    <p className="text-white text-sm font-light tracking-wide leading-snug line-clamp-1">
                        {context.data.master_plan.global_context}
                    </p>
                </div>
            </div>

            {/* Expanded Overlay on Hover */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] max-w-5xl opacity-0 group-hover/theme:opacity-100 pointer-events-none group-hover/theme:pointer-events-auto transition-opacity duration-300 z-50">
                <div className="bg-gradient-to-r from-black/90 via-black/85 to-black/90 backdrop-blur-xl border border-white/20 rounded-xl px-6 py-4 shadow-2xl">
                    {/* Animated Background Accent */}
                    <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/10 via-accent-secondary/10 to-accent-primary/10 opacity-70 rounded-xl" />
                    
                    {/* Content */}
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="flex items-center gap-2 shrink-0 mt-0.5">
                            <div className="relative">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse shadow-[0_0_10px_rgba(255,85,0,0.8)]" />
                                <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-accent-primary animate-ping opacity-75" />
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">Global Theme</span>
                        </div>
                        <p className="text-white text-sm font-light tracking-wide leading-relaxed flex-1">
                            {context.data.master_plan.global_context}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function MusicalBlockBar({ context, currentTime }: MusicalContextDisplayProps) {
    const { currentBlock } = useCurrentContext(context, currentTime);

    if (!context) return null;

    return (
        <div className="w-full max-w-5xl mx-auto bg-gradient-to-br from-black/80 via-black/70 to-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl relative overflow-hidden">
            {/* Subtle animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/5 via-transparent to-accent-secondary/5 opacity-50" />
            
            <div className="relative z-10 p-4">
                {/* Main Content Row */}
                <div className="flex items-center gap-5">

                    {/* Musical Direction - Main Focus */}
                    <div className="flex-1 min-w-0">
                        {currentBlock ? (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 text-accent-secondary" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                    </svg>
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-accent-secondary/80">Musical Direction</span>
                                </div>
                                <div key={currentBlock.musical_direction} className="animate-slideFade text-xl font-bold text-white tracking-wide leading-tight">
                                    {currentBlock.musical_direction}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2.5 text-white/20 py-2">
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white/40 rounded-full animate-spin" />
                                <span className="text-sm font-medium">Waiting for musical cues...</span>
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="h-12 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />

                    {/* Time Range */}
                    {currentBlock && (
                        <div className="flex flex-col items-center shrink-0 bg-white/5 rounded-lg px-4 py-2 border border-white/10 min-w-[100px]">
                            <span className="text-[8px] font-bold uppercase tracking-wider text-white/40 mb-1">Time Range</span>
                            <span className="text-xs font-mono font-semibold text-white/80">
                                {currentBlock.time_range.start.toFixed(1)}s - {currentBlock.time_range.end.toFixed(1)}s
                            </span>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="h-12 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />

                    {/* Metrics */}
                    <div className="flex gap-3 shrink-0">
                        {currentBlock ? (
                            <>
                                <div className="flex flex-col items-center bg-gradient-to-br from-accent-primary/10 to-accent-primary/5 rounded-lg px-4 py-2 border border-accent-primary/20 min-w-[75px]">
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-accent-primary/60 mb-1">BPM</span>
                                    <div key={currentBlock.lyria_config.bpm} className="animate-slideFade text-2xl font-bold text-accent-primary tabular-nums">
                                        {currentBlock.lyria_config.bpm}
                                    </div>
                                </div>
                                <div className="flex flex-col items-center bg-gradient-to-br from-accent-secondary/10 to-accent-secondary/5 rounded-lg px-4 py-2 border border-accent-secondary/20 min-w-[95px]">
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-accent-secondary/60 mb-1">Scale</span>
                                    <div key={currentBlock.lyria_config.scale} className="animate-slideFade text-sm font-bold text-accent-secondary truncate max-w-full">
                                        {currentBlock.lyria_config.scale.replace(/_/g, ' ')}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex gap-3">
                                <div className="flex flex-col items-center bg-white/5 rounded-lg px-4 py-2 border border-white/10 min-w-[75px] opacity-30">
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-white/40 mb-1">BPM</span>
                                    <div className="text-2xl font-bold text-white/20">--</div>
                                </div>
                                <div className="flex flex-col items-center bg-white/5 rounded-lg px-4 py-2 border border-white/10 min-w-[95px] opacity-30">
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-white/40 mb-1">Scale</span>
                                    <div className="text-sm font-bold text-white/20">--</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Timeline Track */}
                <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <svg className="w-3 h-3 text-white/30" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-white/30">Timeline Progress</span>
                        </div>
                        {currentBlock && (
                            <span className="text-[8px] font-mono text-white/40">
                                Block {context.data.master_plan.musical_blocks.indexOf(currentBlock) + 1} of {context.data.master_plan.musical_blocks.length}
                            </span>
                        )}
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex gap-1 border border-white/10 p-0.5">
                        {context.data.master_plan.musical_blocks.map((block, idx) => {
                            const isActive = currentBlock === block;
                            return (
                                <div
                                    key={idx}
                                    className={`flex-1 rounded-full transition-all duration-500 ${
                                        isActive 
                                            ? 'bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary shadow-[0_0_12px_rgba(255,85,0,0.8)] scale-y-150' 
                                            : 'bg-white/20 hover:bg-white/30'
                                    }`}
                                />
                            );
                        })}
                    </div>
                </div>
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
