"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap, MessageSquare, Brain } from "lucide-react";
import { SignUpButton } from "@clerk/nextjs";
import Link from "next/link";

function FloatingNovaBadge({ className = "" }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2, duration: 0.6 }}
      className={`absolute flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border shadow-lg ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-xs font-medium text-foreground">Nova is ready</span>
    </motion.div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-32 relative z-10">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-8 border border-primary/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI-First Project Management
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-[1.05] tracking-tight text-foreground"
          >
            Your Projects, Your Team,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              One Intelligent Workspace
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-lg lg:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Theta brings your team, tasks, and documents together with{" "}
            <span className="text-foreground font-semibold">Nova</span> — an AI
            teammate that understands your work and helps you execute.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <SignUpButton mode="modal">
              <Button
                size="lg"
                className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium shadow-md shadow-primary/20"
              >
                Start Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </SignUpButton>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 rounded-lg text-sm font-medium"
              >
                View Pricing
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-16 w-full max-w-4xl relative"
          >
            <div className="rounded-xl border bg-card shadow-xl overflow-hidden">
              <div className="flex items-center gap-1.5 px-5 py-3 bg-muted/50 border-b">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="ml-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Brain className="w-3.5 h-3.5 text-primary" />
                  <span>Nova — Workspace Intelligence</span>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-emerald-500 font-medium">Connected</span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-muted rounded-lg p-4 text-sm text-foreground">
                      I&apos;ve analyzed your workspace. You have 14 open tasks, 3
                      approaching deadlines, and 1 overdue. Want me to organize
                      the sprint?
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="flex-1 max-w-[75%]">
                    <div className="bg-primary rounded-lg p-4 text-sm text-primary-foreground">
                      Yes. Prioritize by deadline and assign to available team members.
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-muted-foreground/20 flex items-center justify-center flex-shrink-0 text-xs font-medium text-muted-foreground">
                    Y
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-muted rounded-lg p-4 text-sm text-foreground">
                      <p className="font-semibold text-primary mb-2 text-xs uppercase tracking-wider">
                        Sprint organized
                      </p>
                      <ul className="space-y-1.5">
                        <li className="flex items-center gap-2">
                          <Zap className="w-3 h-3 text-emerald-500" />
                          <span>3 high-priority tasks assigned</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Zap className="w-3 h-3 text-emerald-500" />
                          <span>2 deadlines rescheduled</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Zap className="w-3 h-3 text-emerald-500" />
                          <span>Sprint board created with 8 tasks</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <FloatingNovaBadge className="-bottom-3 -right-3" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            className="mt-10 flex items-center gap-6 text-xs text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-emerald-500" /> Real-time sync
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-primary" /> Natural language
            </span>
            <span className="flex items-center gap-1.5">
              <Brain className="w-3 h-3 text-purple-500" /> Context-aware
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
