"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Workflow,
  Zap,
  MessageSquare,
  BarChart3,
  Layers,
  CheckCircle2,
} from "lucide-react";

const differentiators = [
  {
    icon: LayoutDashboard,
    title: "PM features, first",
    desc: "Boards, sprints, timelines, docs, and dashboards — designed for how project managers actually work.",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Workflow,
    title: "Works the way your team works",
    desc: "Flexible workflows that adapt to your process. No rigid templates, no forcing your team into a box.",
    gradient: "from-purple-500/20 to-purple-500/5",
  },
  {
    icon: Zap,
    title: "Automation where it matters",
    desc: "Assignments, reminders, and status updates handled automatically, so your team stays focused on the work.",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: MessageSquare,
    title: "Real-time collaboration",
    desc: "Chat, comment, and decide as work happens — no more waiting for the next status meeting.",
    gradient: "from-amber-500/20 to-amber-500/5",
  },
  {
    icon: BarChart3,
    title: "Clarity you can act on",
    desc: "Live dashboards surface progress and bottlenecks, so everyone stays aligned and informed.",
    gradient: "from-rose-500/20 to-rose-500/5",
  },
  {
    icon: Layers,
    title: "A single place for your team",
    desc: "Projects, tasks, docs, and conversations live together — no tool-hopping to understand what's happening.",
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
            Project management,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              the way it should be
            </span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Built from the ground up for modern teams — fast, flexible, and clean.
            No bloat, no friction, no tools that fight you.
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
                  One workspace, zero tool-hopping
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Boards, tasks, docs, calendar, and chat live together in one place —
                  so you never have to switch between five tools to understand what&apos;s
                  happening.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
