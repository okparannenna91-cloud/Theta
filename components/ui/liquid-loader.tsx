"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LiquidLoaderProps {
    text?: string;
    className?: string;
    fullscreen?: boolean;
}

export function LiquidLoader({
    text = "Loading Theta PM...",
    className,
    fullscreen = false
}: LiquidLoaderProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center gap-8",
            fullscreen ? "fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-xl" : "p-12",
            className
        )}>
            <div className="relative w-48 h-48 flex items-center justify-center">
                {/* The main SVG Loader */}
                <svg
                    viewBox="0 0 200 200"
                    className="w-full h-full animate-slow-spin overflow-visible"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        {/* The Liquid/Smoke Filter */}
                        <filter id="liquid-energy" x="-50%" y="-50%" width="200%" height="200%">
                            <feTurbulence
                                type="turbulence"
                                baseFrequency="0.015"
                                numOctaves="3"
                                result="turbulence"
                            >
                                <animate
                                    attributeName="baseFrequency"
                                    values="0.015;0.025;0.015"
                                    dur="10s"
                                    repeatCount="indefinite"
                                />
                            </feTurbulence>
                            <feDisplacementMap
                                in="SourceGraphic"
                                in2="turbulence"
                                scale="15"
                                xChannelSelector="R"
                                yChannelSelector="G"
                            />
                        </filter>

                        {/* Inner Smoke Trail Filter */}
                        <filter id="smoke-trail" x="-50%" y="-50%" width="200%" height="200%">
                            <feTurbulence
                                type="fractalNoise"
                                baseFrequency="0.03"
                                numOctaves="2"
                                result="noise"
                            />
                            <feDisplacementMap
                                in="SourceGraphic"
                                in2="noise"
                                scale="30"
                            />
                        </filter>
                    </defs>

                    {/* Outer Glow Ring */}
                    <circle
                        cx="100"
                        cy="100"
                        r="70"
                        fill="none"
                        stroke="white"
                        strokeWidth="1"
                        strokeOpacity="0.1"
                        className="blur-[2px]"
                    />

                    {/* The Primary Liquid Ring */}
                    <circle
                        cx="100"
                        cy="100"
                        r="70"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        filter="url(#liquid-energy)"
                        className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] opacity-90"
                    />

                    {/* Secondary Smoke Layer */}
                    <circle
                        cx="100"
                        cy="100"
                        r="68"
                        fill="none"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeDasharray="40 120"
                        filter="url(#smoke-trail)"
                        className="opacity-30 blur-[1px]"
                    />
                </svg>

                {/* Center Core Pulse */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                        animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="w-4 h-4 bg-white rounded-full blur-md"
                    />
                </div>
            </div>

            {text && (
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 2 }}
                    className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse"
                >
                    {text}
                </motion.p>
            )}

            <style jsx global>{`
                @keyframes slow-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-slow-spin {
                    animation: slow-spin 8s linear infinite;
                }
            `}</style>
        </div>
    );
}
