"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, MessageSquare, FolderKanban, ListChecks, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const columns = [
  {
    title: "To Do",
    tasks: [
      { title: "Draft launch announcement", tag: "Marketing", tagClass: "text-purple-500 bg-purple-500/10", priority: "high", assignee: "SK" },
      { title: "Finalize pricing page", tag: "Marketing", tagClass: "text-purple-500 bg-purple-500/10", priority: "med", assignee: "LC" },
      { title: "Integrate billing API", tag: "Engineering", tagClass: "text-blue-500 bg-blue-500/10", priority: "high", assignee: "DT" },
    ],
  },
  {
    title: "In Progress",
    tasks: [
      { title: "Landing page hero", tag: "Design", tagClass: "text-emerald-500 bg-emerald-500/10", priority: "high", assignee: "AN" },
      { title: "Product demo video", tag: "Design", tagClass: "text-emerald-500 bg-emerald-500/10", priority: "med", assignee: "RM" },
    ],
  },
  {
    title: "Done",
    tasks: [
      { title: "Set up analytics", tag: "Engineering", tagClass: "text-blue-500 bg-blue-500/10", priority: "low", assignee: "DT" },
      { title: "Customer interviews", tag: "Research", tagClass: "text-amber-500 bg-amber-500/10", priority: "med", assignee: "LC" },
    ],
  },
];

function PriorityDot({ level }: { level: string }) {
  const color = level === "high" ? "bg-rose-500" : level === "med" ? "bg-amber-500" : "bg-slate-400";
  return <span className={`w-1.5 h-1.5 rounded-full ${color}`} />;
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
            <FolderKanban className="w-3.5 h-3.5" />
            PM-Native Project Management
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-[1.05] tracking-tight text-foreground"
          >
            Your Projects, Your Team,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              One Native Workspace
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-lg lg:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Theta PM brings projects, tasks, docs, and your team into one place — built for
            how project managers actually work. Plan, track, and ship without juggling
            five different tools.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/sign-up">
              <Button
                size="lg"
                className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium shadow-md shadow-primary/20"
              >
                Start Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 rounded-lg text-sm font-medium"
              >
                View Pricing
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                size="lg"
                variant="ghost"
                className="h-12 px-8 rounded-lg text-sm font-medium"
              >
                Sign In
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
                  <FolderKanban className="w-3.5 h-3.5 text-primary" />
                  <span>Product Launch Q3</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                    Sprint 14
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="flex -space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-semibold text-white ring-2 ring-card">AN</div>
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[8px] font-semibold text-white ring-2 ring-card">SK</div>
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] font-semibold text-white ring-2 ring-card">DT</div>
                  </div>
                  <span className="text-xs text-emerald-500 font-medium">6 members online</span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3 text-left">
                    <p className="text-xs text-muted-foreground">Open tasks</p>
                    <p className="text-xl font-semibold text-foreground">14</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-left">
                    <p className="text-xs text-muted-foreground">Sprint capacity</p>
                    <p className="text-xl font-semibold text-foreground">82%</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-left">
                    <p className="text-xs text-muted-foreground">Deadlines this week</p>
                    <p className="text-xl font-semibold text-foreground">2</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {columns.map((col, i) => (
                    <div key={i} className="rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold text-foreground">{col.title}</span>
                        <span className="text-[10px] text-muted-foreground">{col.tasks.length}</span>
                      </div>
                      <div className="space-y-2">
                        {col.tasks.map((task, j) => (
                          <div key={j} className="rounded-lg border bg-card p-3 text-left shadow-sm">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <PriorityDot level={task.priority} />
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${task.tagClass}`}>
                                {task.tag}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-foreground leading-snug mb-2">{task.title}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {i === 2 ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <ListChecks className="w-3 h-3 text-muted-foreground" />
                                )}
                              </div>
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-semibold text-primary">
                                {task.assignee}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            className="mt-10 flex items-center gap-6 text-xs text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <FolderKanban className="w-3 h-3 text-emerald-500" /> Boards & timelines
            </span>
            <span className="flex items-center gap-1.5">
              <ListChecks className="w-3 h-3 text-primary" /> Sprints & tasks
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-purple-500" /> Docs & chat
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-500" /> Real-time sync
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
