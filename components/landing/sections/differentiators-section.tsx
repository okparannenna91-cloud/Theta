"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Sparkles,
  Workflow,
  Zap,
  MessageSquare,
  LayoutDashboard,
  CheckCircle2,
} from "lucide-react";

const differentiators = [
  {
    icon: Brain,
    title: "AI built into the foundation",
    desc: "Nova isn&apos;t an add-on. It&apos;s part of every project, task, and document from day one.",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: LayoutDashboard,
    title: "One assistant everywhere",
    desc: "Not a separate AI page. Nova is in your boards, your tasks, your calendar — wherever you work.",
    gradient: "from-purple-500/20 to-purple-500/5",
  },
  {
    icon: Workflow,
    title: "Workspace-aware intelligence",
    desc: "Nova understands your team, your projects, and your context. It doesn&apos;t guess — it knows.",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: Zap,
    title: "Real execution, not suggestions",
    desc: "Nova creates tasks, assigns work, adjusts timelines — it takes action inside your workspace.",
    gradient: "from-amber-500/20 to-amber-500/5",
  },
  {
    icon: MessageSquare,
    title: "Natural language project management",
    desc: "&ldquo;Plan the sprint&rdquo; or &ldquo;What&apos;s blocked?&rdquo; — talk to your workspace like you talk to your team.",
    gradient: "from-rose-500/20 to-rose-500/5",
  },
  {
    icon: Sparkles,
    title: "A single place for teams and AI",
    desc: "Your team collaborates. Nova coordinates. Everything lives in one workspace.",
    gradient: "from-cyan-500/20 to-cyan-500/5",
  },
];

export default function DifferentiatorsSection() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] bg-primary/[0.02] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight">
            What makes Theta{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              different
            </span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            We didn&apos;t bolt AI onto a project management tool. We built a project
            management platform around an intelligent teammate.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {differentiators.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="group relative p-6 rounded-xl border bg-card hover:border-primary/30 hover:shadow-lg transition-all"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 border group-hover:scale-105 transition-transform`}>
                <item.icon className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <div className="p-6 rounded-xl border-2 border-primary/20 bg-card">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Nova works across the entire platform
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Unlike tools that confine AI to a sidebar chat, Nova operates
                  everywhere — inside your boards, your task views, your calendar,
                  and your documents. It creates, edits, assigns, and organizes
                  without leaving your workflow.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
