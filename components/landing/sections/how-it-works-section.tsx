"use client";

import { motion } from "framer-motion";
import { Sparkles, UserPlus, Workflow, ArrowDown } from "lucide-react";
import { SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Sparkles,
    title: "Create your workspace",
    desc: "Sign up and Theta instantly sets up your workspace. Nova analyzes your team structure and prepares your environment.",
    color: "from-primary/20 to-primary/5",
  },
  {
    icon: UserPlus,
    title: "Invite your team",
    desc: "Share secure invite links with role-based permissions. Nova learns who does what and how your team operates.",
    color: "from-purple-500/20 to-purple-500/5",
  },
  {
    icon: Workflow,
    title: "Let Nova plan, organize, and execute",
    desc: "Start working. Nova schedules tasks, tracks progress, answers questions, and helps your team ship faster — automatically.",
    color: "from-emerald-500/20 to-emerald-500/5",
  },
];

export default function HowItWorksSection() {
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
            Get your team working in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              minutes, not weeks
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            No long setup. No migration headaches. Just a workspace built around your team.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative flex items-start gap-6 p-6 rounded-xl border bg-card hover:border-primary/30 transition-all group"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 border`}>
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>

                {i < steps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="absolute -bottom-8 left-10 hidden sm:block"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-primary/30 to-transparent" />
                      <ArrowDown className="w-4 h-4 text-primary/40" />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mt-12"
        >
          <SignUpButton mode="modal">
            <Button className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium shadow-md shadow-primary/20">
              Start Free — No Credit Card
            </Button>
          </SignUpButton>
        </motion.div>
      </div>
    </section>
  );
}
