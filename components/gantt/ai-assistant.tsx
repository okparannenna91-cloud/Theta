"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Sparkles, 
    ChevronRight, 
    ChevronLeft, 
    Bot, 
    Lightbulb, 
    AlertCircle, 
    CheckCircle2,
    Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AIScheduleAssistantProps {
    tasks: any[];
    onApplySuggestion?: (suggestion: any) => void;
}

export default function AIScheduleAssistant({ tasks, onApplySuggestion }: AIScheduleAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Heuristic-based suggestions (Mock AI analysis)
    const suggestions = [
        {
            id: 1,
            type: "optimization",
            title: "Shorten Critical Path",
            description: "The task 'UI/UX Design' is on the critical path. Adding one more designer could shorten this by 3 days.",
            impact: "High",
            icon: Zap
        },
        {
            id: 2,
            type: "risk",
            title: "Resource Overload",
            description: "Sarah is assigned to 4 concurrent tasks next week. Consider reassigning 'Documentation' to Mark.",
            impact: "Medium",
            icon: AlertCircle
        },
        {
            id: 3,
            type: "efficiency",
            title: "Parallel Execution",
            description: "Backend API and Frontend integration can start simultaneously if you use mock data.",
            impact: "Low",
            icon: Lightbulb
        }
    ];

    return (
        <div className="fixed bottom-20 right-8 z-50 flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="w-96 bg-background/80 backdrop-blur-3xl border border-primary/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* AI Header */}
                        <div className="p-6 bg-gradient-to-r from-primary/20 to-purple-500/10 border-b border-primary/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary rounded-xl">
                                    <Bot className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-tight">Theta AI Agent</h3>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">Schedule Intelligence</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[8px] font-black">PRO</Badge>
                        </div>

                        {/* Analysis Content */}
                        <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Smart Suggestions</span>
                                <Button variant="ghost" size="sm" className="h-6 text-[9px] font-black uppercase tracking-widest hover:text-primary">
                                    Refresh
                                </Button>
                            </div>

                            {suggestions.map((s) => (
                                <motion.div
                                    key={s.id}
                                    whileHover={{ x: 4 }}
                                    className="p-4 rounded-2xl bg-secondary/30 border border-white/5 hover:border-primary/20 transition-all cursor-pointer group"
                                >
                                    <div className="flex gap-4">
                                        <div className="p-2 bg-background/50 rounded-xl h-fit border border-white/5 group-hover:scale-110 transition-transform">
                                            <s.icon className={cn(
                                                "h-4 w-4",
                                                s.type === "risk" ? "text-rose-500" : "text-primary"
                                            )} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-[11px] font-black uppercase tracking-tight">{s.title}</h4>
                                                <Badge variant="outline" className="text-[7px] py-0 h-4 border-white/10">{s.impact} Impact</Badge>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                {s.description}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* AI Footer */}
                        <div className="p-4 bg-secondary/20 border-t border-white/5">
                            <Button className="w-full rounded-2xl h-11 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                                <Sparkles className="h-3.5 w-3.5 mr-2" /> Optimize Timeline
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-16 w-16 rounded-full shadow-2xl transition-all duration-500 border-2",
                    isOpen 
                        ? "bg-background text-primary border-primary rotate-90" 
                        : "bg-primary text-white border-transparent hover:scale-110 hover:shadow-primary/40"
                )}
            >
                {isOpen ? <ChevronRight className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
            </Button>
        </div>
    );
}
