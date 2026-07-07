"use client";

import { motion } from "framer-motion";
import {
  Lightbulb,
  MessageSquare,
  FolderKanban,
  ListChecks,
  Users,
  BarChart3,
  Rocket,
  Sparkles,
} from "lucide-react";

const timeline = [
  { icon: Lightbulb, label: "Idea", desc: "A new feature, campaign, or product takes shape", color: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: MessageSquare, label: "Ask Nova", desc: "&ldquo;Plan a product launch for Q3&rdquo; — Nova gets to work", color: "text-primary", bg: "bg-primary/10" },
  { icon: FolderKanban, label: "Project Created", desc: "Nova creates the project, sets up the board, and defines phases", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: ListChecks, label: "Tasks Organized", desc: "Tasks are created, prioritized, assigned, and scheduled", color: "text-purple-500", bg: "bg-purple-500/10" },
  { icon: Users, label: "Team Collaborates", desc: "Your team works in real-time. Nova tracks progress and adjusts.", color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: BarChart3, label: "Progress Tracked", desc: "Dashboards update automatically. Nova surfaces insights.", color: "text-rose-500", bg: "bg-rose-500/10" },
  { icon: Rocket, label: "Project Delivered", desc: "Ship with confidence. Nova handles the retrospective.", color: "text-cyan-500", bg: "bg-cyan-500/10" },
];

export default function IdeaToDeliverySection() {
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
            From idea to delivery,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              Nova is with you at every step
            </span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Watch how a single idea transforms into a delivered project — with Nova
            coordinating the entire journey.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-primary/10 to-transparent hidden md:block" />

          <div className="space-y-8">
            {timeline.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="relative flex items-start gap-6 md:gap-10 group"
              >
                <div className="hidden md:flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-xl ${step.bg} flex items-center justify-center border-2 border-background shadow-sm group-hover:scale-105 transition-transform z-10`}>
                    <step.icon className={`w-7 h-7 ${step.color}`} />
                  </div>
                </div>

                <div className="md:hidden flex items-center gap-4 w-full">
                  <div className={`w-10 h-10 rounded-lg ${step.bg} flex items-center justify-center flex-shrink-0`}>
                    <step.icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{step.label}</h3>
                      <Sparkles className="w-3 h-3 text-primary/40" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </div>

                <div className="hidden md:block flex-1 pt-4">
                  <div className="p-4 rounded-xl border bg-card group-hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground">{step.label}</h3>
                      {i >= 1 && i <= 5 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                          <Sparkles className="w-2.5 h-2.5" />
                          Nova
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>

                {i < timeline.length - 1 && (
                  <div className="hidden md:block absolute left-[31px] top-16 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
