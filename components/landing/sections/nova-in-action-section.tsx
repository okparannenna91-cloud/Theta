"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, ArrowRight, CheckCircle2 } from "lucide-react";

const demos = [
  {
    prompt: "Plan our product launch",
    response: [
      { type: "action", text: "Creating project: Product Launch Q3" },
      { type: "action", text: "Breaking into 4 phases: Pre-launch, Launch, Post-launch, Retro" },
      { type: "action", text: "Assigning tasks to design, engineering, and marketing" },
      { type: "done", text: "Project created with 12 tasks across 3 teams" },
    ],
  },
  {
    prompt: "Create next sprint",
    response: [
      { type: "action", text: "Analyzing current sprint velocity..." },
      { type: "action", text: "Moving 8 incomplete tasks to new sprint" },
      { type: "action", text: "Adding 5 high-priority backlog items" },
      { type: "done", text: "Sprint 14 created with 13 tasks. Estimated capacity: 82%" },
    ],
  },
  {
    prompt: "Assign high-priority bugs",
    response: [
      { type: "action", text: "Finding unassigned P0 and P1 bugs..." },
      { type: "action", text: "Assigning 3 P0 bugs to senior engineers" },
      { type: "action", text: "Assigning 5 P1 bugs based on team workload" },
      { type: "done", text: "8 priority bugs assigned. Notifying team members." },
    ],
  },
  {
    prompt: "Summarize this week's progress",
    response: [
      { type: "action", text: "Scanning all active projects..." },
      { type: "action", text: "12 tasks completed. 4 in progress. 2 blocked." },
      { type: "action", text: "Blockers: Design assets for landing page, API rate limit" },
      { type: "done", text: "Weekly summary ready. Team is 73% toward sprint goal." },
    ],
  },
];

const quickPrompts = [
  "Find overdue tasks",
  "Prepare tomorrow's meeting",
  "Organize our marketing campaign",
];

export default function NovaInActionSection() {
  const [activeDemo, setActiveDemo] = useState(0);
  const [showResponse, setShowResponse] = useState(false);

  const handleDemoClick = (index: number) => {
    setShowResponse(false);
    setTimeout(() => {
      setActiveDemo(index);
      setShowResponse(true);
    }, 100);
  };

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] to-background pointer-events-none" />
      <div className="absolute top-1/4 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight">
            See <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Nova</span> in action
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Real prompts. Real responses. Nova works inside your workspace.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="lg:col-span-2 space-y-3"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Try a prompt
            </p>
            {demos.map((demo, i) => (
              <button
                key={i}
                onClick={() => handleDemoClick(i)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  activeDemo === i
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border bg-card hover:border-primary/30 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${activeDemo === i ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  <span className={`text-sm font-medium ${
                    activeDemo === i ? "text-primary" : "text-foreground"
                  }`}>
                    &ldquo;{demo.prompt}&rdquo;
                  </span>
                </div>
              </button>
            ))}

            <div className="pt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                More examples
              </p>
              {quickPrompts.map((prompt, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="w-3 h-3 text-primary/60" />
                  <span>{prompt}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="lg:col-span-3"
          >
            <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Nova</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-emerald-500 font-medium">Processing</span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4 min-h-[280px]">
                <div className="flex justify-end">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg rounded-tr-none p-4 max-w-[90%]">
                    <p className="text-sm font-medium text-foreground">
                      &ldquo;{demos[activeDemo].prompt}&rdquo;
                    </p>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {showResponse && (
                    <motion.div
                      key={activeDemo}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-3"
                    >
                      {demos[activeDemo].response.map((item, j) => (
                        <motion.div
                          key={j}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: j * 0.15, duration: 0.3 }}
                          className="flex items-start gap-3"
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            item.type === "done"
                              ? "bg-emerald-500/20"
                              : "bg-primary/10"
                          }`}>
                            {item.type === "done" ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Sparkles className="w-3 h-3 text-primary" />
                            )}
                          </div>
                          <div className={`rounded-lg p-3 text-sm flex-1 ${
                            item.type === "done"
                              ? "bg-emerald-500/5 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-foreground"
                          }`}>
                            {item.text}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
