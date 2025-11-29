import React from 'react';
import { LiquidGlassCard } from '@/components/ui';
import Image from 'next/image';

const testimonials = [
    {
        name: 'Sarah Jenkins',
        role: 'Content Creator',
        content: "Timbre has completely revolutionized my workflow. I used to spend hours searching for the right music, now it takes seconds.",
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
    {
        name: 'David Chen',
        role: 'Filmmaker',
        content: "The AI understands the emotional beats of my footage better than most stock music libraries. It's like having a personal composer.",
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    },
    {
        name: 'Elena Rodriguez',
        role: 'Social Media Manager',
        content: "Engagement on our videos has increased by 40% since we started using Timbre. The custom soundtracks really make a difference.",
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
    },
];

export const TestimonialsSection = () => {
    return (
        <section className="relative py-24 px-4 md:px-6 overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-accent-primary/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-secondary/5 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
                        Loved by Creators
                    </h2>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Join thousands of creators who are elevating their content with AI-generated music.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {testimonials.map((testimonial, index) => (
                        <LiquidGlassCard
                            key={index}
                            className="p-8 h-full hover:bg-white/5 transition-colors duration-300"
                        >
                            <div className="flex items-center mb-6">
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-accent-primary/20 mr-4">
                                    <img
                                        src={testimonial.avatar}
                                        alt={testimonial.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-white">
                                        {testimonial.name}
                                    </h4>
                                    <p className="text-sm text-accent-primary">
                                        {testimonial.role}
                                    </p>
                                </div>
                            </div>
                            <p className="text-gray-300 italic leading-relaxed">
                                "{testimonial.content}"
                            </p>
                        </LiquidGlassCard>
                    ))}
                </div>
            </div>
        </section>
    );
};
