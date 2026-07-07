"use client";

import { motion } from "framer-motion";
import {
  Rocket,
  Palette,
  Package,
  Globe,
  Building2,
  Shield,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const teams = [
  {
    icon: Rocket,
    title: "Startups",
    desc: "Move fast without chaos. Nova helps you plan sprints, track milestones, and adapt as you grow.",
    gradient: "from-blue-500/20 to-blue-500/5",
  },
  {
    icon: Palette,
    title: "Agencies",
    desc: "Manage multiple clients in isolated workspaces. Nova keeps every project on track.",
    gradient: "from-purple-500/20 to-purple-500/5",
  },
  {
    icon: Package,
    title: "Product Teams",
    desc: "From roadmap to release. Nova organizes backlogs, prioritizes features, and monitors progress.",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: Globe,
    title: "Remote Teams",
    desc: "Stay aligned across timezones. Nova provides async updates and 24/7 workspace awareness.",
    gradient: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    icon: Building2,
    title: "Growing Businesses",
    desc: "Scale without adding overhead. Nova automates coordination as your team expands.",
    gradient: "from-amber-500/20 to-amber-500/5",
  },
  {
    icon: Shield,
    title: "Enterprises",
    desc: "Enterprise security with workspace isolation, role-based access, and audit trails.",
    gradient: "from-rose-500/20 to-rose-500/5",
  },
];

export default function BuiltForTeamsSection() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight">
            Built for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              every team
            </span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Nova adapts to your workflow instead of forcing you into rigid processes.
            Theta molds to how your team works.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="group relative p-6 rounded-xl border bg-card hover:border-primary/30 hover:shadow-lg transition-all"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${team.gradient} flex items-center justify-center mb-4 border`}>
                <team.icon className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{team.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{team.desc}</p>
              <div className="flex items-center gap-1.5 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <Sparkles className="w-3 h-3" />
                <span>Nova-ready</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
