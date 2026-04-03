"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2, Network } from "lucide-react";
import { Button } from "@/components/ui/button";

mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "loose",
    themeVariables: {
        primaryColor: "#4f46e5",
        primaryTextColor: "#fff",
        primaryBorderColor: "#4f46e5",
        lineColor: "#6366f1",
        secondaryColor: "#818cf8",
        tertiaryColor: "#f5f3ff",
        fontSize: "12px",
        fontFamily: "Inter"
    }
});

interface WikiGraphProps {
    currentDoc: any;
    backlinks: any[];
}

export function WikiGraph({ currentDoc, backlinks }: WikiGraphProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>("");

    useEffect(() => {
        if (!currentDoc || !backlinks) return;

        const generateGraph = async () => {
            // Build mermaid definition
            // format: subgraph ... end
            const safeTitle = (t: string) => t.replace(/"/g, "'").slice(0, 20);
            
            let definition = `graph LR\n`;
            definition += `    ROOT(("${currentDoc.emoji || "📄"} ${safeTitle(currentDoc.title || "Subject")}"))\n`;
            definition += `    style ROOT fill:#4f46e5,stroke:#4f46e5,color:#fff,stroke-width:4px\n`;

            backlinks.forEach((link, i) => {
                const linkId = `link${i}`;
                definition += `    ${linkId}["${link.emoji || "📄"} ${safeTitle(link.title || "Node")}"]\n`;
                definition += `    ${linkId} --> ROOT\n`;
                definition += `    style ${linkId} fill:#fff,stroke:#e2e8f0,color:#1e293b,stroke-width:2px\n`;
            });

            try {
                const { svg } = await mermaid.render(`graph-${currentDoc.id}`, definition);
                setSvg(svg);
            } catch (error) {
                console.error("Mermaid error:", error);
            }
        };

        generateGraph();
    }, [currentDoc, backlinks]);

    return (
        <div className="mt-20 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-600/20">
                         <Network className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Intelligence Visualization</h3>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-indigo-500 opacity-80">Neural Connectivity Graph v1.0</p>
                    </div>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
            </div>

            <motion.div 
                layout
                className={cn(
                    "relative bg-white/40 dark:bg-slate-950/40 backdrop-blur-3xl border border-slate-100 dark:border-white/5 rounded-[3rem] overflow-hidden transition-all duration-700 p-10 flex items-center justify-center min-h-[400px]",
                    isExpanded ? "fixed inset-10 z-[100] min-h-0" : ""
                )}
            >
                <div 
                    dangerouslySetInnerHTML={{ __html: svg }} 
                    className="w-full h-full flex items-center justify-center transition-opacity hover:opacity-100 opacity-90 cursor-grab active:cursor-grabbing scale-110"
                />
                
                {!svg && (
                    <div className="absolute inset-0 flex items-center justify-center grayscale opacity-20">
                        <Network className="h-20 w-20 animate-pulse" />
                    </div>
                )}
            </motion.div>
        </div>
    );
}

import { cn } from "@/lib/utils";
