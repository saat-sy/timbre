'use client';

import { motion } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

// Node Types
type NodeType = 'simple' | 'branch' | 'converge';

interface FlowNode {
    id: string;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    x: number; // Logical X position (0-6)
    y: number; // Logical Y position (0-2, where 1 is center)
}

const nodes: FlowNode[] = [
    {
        id: 'upload',
        title: 'Upload',
        x: 0,
        y: 1,
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
        )
    },
    // Branches (Shifted to x=1)
    {
        id: 'transcript',
        title: 'Transcript',
        x: 1,
        y: 0,
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
        )
    },
    {
        id: 'scenes',
        title: 'Select Scenes',
        x: 1,
        y: 1,
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        )
    },
    {
        id: 'frame',
        title: 'Rep. Frame',
        x: 1,
        y: 2,
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        )
    },
    // Converge
    {
        id: 'summarizer',
        title: 'Summarizer',
        x: 2,
        y: 1,
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        )
    },
    {
        id: 'thinking',
        title: 'Thinking',
        x: 3,
        y: 1,
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        )
    },
    {
        id: 'websocket',
        title: 'WebSocket',
        x: 4,
        y: 1,
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        )
    },
    {
        id: 'lyria',
        title: 'Lyria',
        x: 5,
        y: 1,
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
        )
    },
];

export function DataFlowSection() {
    // SVG Coordinate System
    // X spacing: 200 units
    // Y spacing: 150 units
    // Center Y: 300
    const xStep = 200;
    const yStep = 150;
    const startX = 100;
    const startY = 150; // Top row Y

    const getNodePos = (node: FlowNode) => ({
        x: startX + node.x * xStep,
        y: startY + node.y * yStep
    });

    // Generate paths
    const paths = [
        // Upload -> Branches
        { from: 'upload', to: 'transcript' },
        { from: 'upload', to: 'scenes' },
        { from: 'upload', to: 'frame' },
        // Branches -> Summarizer
        { from: 'transcript', to: 'summarizer' },
        { from: 'scenes', to: 'summarizer' },
        { from: 'frame', to: 'summarizer' },
        // Summarizer -> Thinking
        { from: 'summarizer', to: 'thinking' },
        // Thinking -> WebSocket
        { from: 'thinking', to: 'websocket' },
        // WebSocket -> Lyria
        { from: 'websocket', to: 'lyria' },
    ];

    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const parentWidth = containerRef.current.offsetWidth;
                const baseWidth = 1200;
                const newScale = parentWidth / baseWidth;
                setScale(newScale);
            }
        };

        // Initial calculation
        updateScale();

        // Use ResizeObserver for robust width tracking
        const observer = new ResizeObserver(updateScale);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section className="py-20 md:py-32 relative">
            {/* Background */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

            <div className="max-w-[90rem] mx-auto px-4 relative z-10">
                <div className="text-center mb-12 md:mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70"
                    >
                        Intelligent <span className="text-accent-primary">Processing</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-white/60 max-w-2xl mx-auto font-light text-base md:text-lg px-4"
                    >
                        Multi-agent architecture analyzing every frame to compose the perfect score.
                    </motion.p>
                </div>
            </div>

            {/* Graph Container - Dynamic Scaling - Full Width */}
            <div
                ref={containerRef}
                className="relative w-full max-w-[1600px] mx-auto overflow-hidden z-20"
                style={{ height: 600 * scale }}
            >
                <div
                    className="absolute top-0 left-0 origin-top-left"
                    style={{
                        width: 1200,
                        height: 600,
                        transform: `scale(${scale})`,
                    }}
                >
                    {/* SVG Layer for Connections */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                        <defs>
                            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#ee872c" />
                                <stop offset="100%" stopColor="#f95c34" />
                            </linearGradient>
                            <marker id="flow-arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#f95c34" />
                            </marker>
                        </defs>

                        {paths.map((path, i) => {
                            const startNode = nodes.find(n => n.id === path.from)!;
                            const endNode = nodes.find(n => n.id === path.to)!;
                            const start = getNodePos(startNode);
                            const end = getNodePos(endNode);

                            // Calculate path d
                            // If same Y, straight line
                            // If diff Y, bezier curve
                            let d = '';
                            const gap = 55; // Increased gap to prevent overlap
                            if (start.y === end.y) {
                                d = `M ${start.x + gap} ${start.y} L ${end.x - gap} ${end.y}`;
                            } else {
                                const midX = (start.x + end.x) / 2;
                                d = `M ${start.x + gap} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x - gap} ${end.y}`;
                            }

                            return (
                                <g key={`${path.from}-${path.to}`}>
                                    {/* Base Path */}
                                    <path
                                        d={d}
                                        stroke="#ee872c"
                                        strokeOpacity="0.4"
                                        strokeWidth="1"
                                        fill="none"
                                        markerEnd="url(#flow-arrowhead)"
                                    />

                                    {/* Animated Particle */}
                                    <circle r="3" fill="#ee872c">
                                        <animateMotion
                                            dur="2s"
                                            repeatCount="indefinite"
                                            path={d}
                                            keyPoints="0;1"
                                            keyTimes="0;1"
                                            calcMode="spline"
                                            keySplines="0.4 0 0.2 1"
                                        />
                                    </circle>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Nodes Layer */}
                    {nodes.map((node, index) => {
                        const pos = getNodePos(node);
                        return (
                            <motion.div
                                key={node.id}
                                initial={{ opacity: 0, scale: 0.8, x: "-50%", y: "-50%" }}
                                whileInView={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="absolute w-32 md:w-40 flex flex-col items-center group"
                                style={{ left: pos.x, top: pos.y }}
                            >
                                {/* Node Circle */}
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center relative z-10 group-hover:border-accent-primary/50 group-hover:bg-accent-primary/5 transition-all duration-500 shadow-2xl backdrop-blur-sm">
                                    <div className="text-white/60 group-hover:text-accent-primary transition-colors duration-500 scale-75 md:scale-100">
                                        {node.icon}
                                    </div>

                                    {/* Active Glow */}
                                    <div className="absolute inset-0 bg-accent-primary/20 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </div>

                                {/* Labels */}
                                <div className="mt-3 md:mt-4 text-center">
                                    <h3 className="text-xs md:text-sm font-semibold text-white group-hover:text-accent-primary transition-colors duration-300 whitespace-nowrap">
                                        {node.title}
                                    </h3>
                                    {node.description && (
                                        <p className="text-[10px] md:text-xs text-white/40 mt-1">
                                            {node.description}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}

                </div>
            </div>
        </section>
    );
}
