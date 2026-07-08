"use client";

import { motion } from "framer-motion";
import {
  FolderKanban,
  ListChecks,
  FileText,
  Calendar,
  Users,
  Sparkles,
  Bell,
  BarChart3,
  Building2,
  Search,
} from "lucide-react";

const features = [
  {
    icon: FolderKanban,
    title: "Projects",
    desc: "Organize work into projects with boards, timelines, and full visibility.",
    gradient: "from-blue-500/20 to-blue-500/5",
  },
  {
    icon: ListChecks,
    title: "Tasks",
    desc: "Create, assign, prioritize, and track tasks with Nova's help.",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: FileText,
    title: "Documents",
    desc: "Write specs, notes, and plans that Nova can read and reference.",
    gradient: "from-purple-500/20 to-purple-500/5",
  },
  {
    icon: Calendar,
    title: "Calendar",
    desc: "Schedule events, set deadlines, and manage team availability.",
    gradient: "from-rose-500/20 to-rose-500/5",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Chat, comment, and collaborate in real-time across your workspace.",
    gradient: "from-amber-500/20 to-amber-500/5",
  },
  {
    icon: Sparkles,
    title: "AI by Nova",
    desc: "Your intelligent teammate that understands everything and helps execute.",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Bell,
    title: "Notifications",
    desc: "Stay informed with smart alerts about what matters to you.",
    gradient: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    icon: BarChart3,
    title: "Dashboards",
    desc: "Visualize progress, spot bottlenecks, and make data-driven decisions.",
    gradient: "from-violet-500/20 to-violet-500/5",
  },
  {
    icon: Building2,
    title: "Workspaces",
    desc: "Isolated environments for teams, clients, or departments.",
    gradient: "from-slate-500/20 to-slate-500/5",
  },
];

export default function EcosystemSection() {
  return (
    <section id="features" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight">
            Everything in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              one workspace
            </span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Projects, tasks, docs, calendar, chat — and Nova connects them all.
            Instead of searching through five tools, just ask Nova.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.03, duration: 0.4 }}
              className="group relative p-5 rounded-xl border bg-card hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0 border`}>
                  <feature.icon className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mt-12 p-8 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/[0.04] to-purple-500/[0.04] text-center max-w-3xl mx-auto"
        >
          <Search className="w-8 h-8 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">
            &ldquo;Find the Q4 marketing plan and show me what&apos;s overdue&rdquo;
          </h3>
          <p className="text-sm text-muted-foreground">
            Nova searches your projects, tasks, and documents — and gives you an answer
            in seconds. No digging through folders.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
