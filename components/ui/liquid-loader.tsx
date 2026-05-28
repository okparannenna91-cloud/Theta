"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LiquidLoaderProps {
    text?: string;
    className?: string;
    fullscreen?: boolean;
}

export function LiquidLoader({
    text = "Loading...",
    className,
    fullscreen = false
}: LiquidLoaderProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center gap-4",
            fullscreen ? "fixed inset-0 z-[9999] bg-background" : "p-12",
            className
        )}>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            {text && (
                <p className="text-sm text-muted-foreground">{text}</p>
            )}
        </div>
    );
}
