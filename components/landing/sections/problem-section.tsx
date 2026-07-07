"use client";

import { motion } from "framer-motion";
import {
  Search,
  RefreshCw,
  Clock,
  CalendarX,
  LayoutDashboard,
  BellOff,
  FolderTree,
} from "lucide-react";

const frustrations = [
  { icon: Search, label: "Scattered across tools", desc: "Tasks in Asana, docs in Notion, chat in Slack — nothing connects" },
  { icon: RefreshCw, label: "Endless context switching", desc: "Alt-Tab between 7 tabs just to understand what's happening" },
  { icon: Clock, label: "Forgotten deadlines", desc: "Slipped dates aren't noticed until someone asks 'is this done?'" },
  { icon: CalendarX, label: "Manual planning", desc: "Hours spent in planning meetings that should take minutes" },
  { icon: LayoutDashboard, label: "Too many tools", desc: "A stack of SaaS subscriptions that still don't cover everything" },
  { icon: BellOff, label: "Constant status updates", desc: "More time reporting work than doing work" },
  { icon: FolderTree, label: "Information buried", desc: "The document you need is in the project that no one can find" },
];

export default function ProblemSection() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight">
            Project management shouldn&apos;t feel like{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              managing another project
            </span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            If your team spends more time wrestling with tools than doing meaningful work,
            you&apos;re not alone. Here&apos;s what we hear every day.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {frustrations.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="group relative p-5 rounded-xl border bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-default"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0 group-hover:bg-destructive/20 transition-colors">
                  <item.icon className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{item.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="lg:col-span-1 relative p-5 rounded-xl border-2 border-primary/20 bg-primary/5 flex items-center justify-center"
          >
            <p className="text-sm font-semibold text-primary text-center">
              What if one intelligent workspace could solve all of this?
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
