import React from 'react';
import { LiquidGlassCard } from '@/components/ui';
import { Cpu, Activity, Lock, Database, Zap, Layers } from 'lucide-react';

const features = [
    {
        title: 'Lyria Audio Engine',
        description: 'Proprietary AI model optimized for high-fidelity musical synthesis and emotional alignment.',
        icon: Cpu,
        gradient: 'from-purple-500 to-blue-500',
        tech: 'Google DeepMind',
    },
    {
        title: 'Redis Event Bus',
        description: 'Low-latency state synchronization enabling real-time collaboration and feedback loops.',
        icon: Database,
        gradient: 'from-red-500 to-orange-500',
        tech: 'Redis / PubSub',
    },
    {
        title: 'Global Eval Pipeline',
        description: 'Automated quality assurance system ensuring broadcast-ready audio output standards.',
        icon: Activity,
        gradient: 'from-green-500 to-emerald-500',
        tech: 'Custom Evaluation',
    },
    {
        title: 'Amplify Security',
        description: 'Enterprise-grade authentication and authorization flow with secure session management.',
        icon: Lock,
        gradient: 'from-blue-500 to-cyan-500',
        tech: 'AWS Cognito',
    },
    {
        title: 'Next.js Architecture',
        description: 'Server-side rendering and optimized routing for lightning-fast page loads and SEO.',
        icon: Zap,
        gradient: 'from-yellow-500 to-amber-500',
        tech: 'React Server Components',
    },
    {
        title: 'Scene Analysis',
        description: 'Frame-accurate video processing to detect cuts, mood, and pacing for perfect sync.',
        icon: Layers,
        gradient: 'from-pink-500 to-rose-500',
        tech: 'Computer Vision',
    },
];

export const FeaturesSection = () => {
    return (
        <section className="relative py-24 px-4 md:px-6">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
                        Powered by Advanced Tech
                    </h2>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Built on a modern stack designed for performance, scalability, and quality.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {features.map((feature, index) => (
                        <LiquidGlassCard
                            key={index}
                            className="p-6 h-full hover:bg-white/5 transition-colors duration-300 group relative overflow-hidden"
                        >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-accent-primary transition-colors">
                                {feature.title}
                            </h3>
                            <div className="mb-3">
                                <span className="text-xs font-mono px-2 py-1 rounded-full bg-white/10 text-accent-secondary border border-white/5">
                                    {feature.tech}
                                </span>
                            </div>
                            <p className="text-gray-400 leading-relaxed text-sm">
                                {feature.description}
                            </p>
                        </LiquidGlassCard>
                    ))}
                </div>
            </div>
        </section>
    );
};
