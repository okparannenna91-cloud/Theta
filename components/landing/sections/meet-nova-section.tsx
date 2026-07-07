"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  Brain,
  MessageSquare,
  FolderKanban,
  ListChecks,
  Calendar,
  Users,
  Target,
  FileText,
  Search,
  Workflow,
  BarChart3,
} from "lucide-react";

const capabilities = [
  { icon: FolderKanban, label: "Creates projects" },
  { icon: ListChecks, label: "Plans and organizes tasks" },
  { icon: Workflow, label: "Breaks goals into steps" },
  { icon: Target, label: "Manages priorities" },
  { icon: BarChart3, label: "Summarizes progress" },
  { icon: Search, label: "Finds information instantly" },
  { icon: Calendar, label: "Tracks deadlines" },
  { icon: Users, label: "Understands team members" },
  { icon: FileText, label: "Reads documents" },
  { icon: MessageSquare, label: "Answers workspace questions" },
];

const understands = [
  "Your projects and tasks",
  "Team members and roles",
  "Deadlines and priorities",
  "Documents and conversations",
  "Workspace structure and context",
];

export default function MeetNovaSection() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] to-background pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-0 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" /> Your AI Teammate
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight">
            Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Nova</span>.
            <br />
            <span className="text-2xl sm:text-3xl text-muted-foreground font-normal">
              Not a chatbot. An intelligent project partner.
            </span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Nova lives inside your workspace. It understands your projects, your team,
            and your goals — then helps you plan, organize, and execute. No separate
            AI page. No context switching. Just one teammate that knows everything.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="space-y-6"
          >
            <h3 className="text-lg font-semibold text-foreground">
              Nova understands your entire workspace
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {understands.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="relative"
          >
            <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Nova</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">Workspace-aware</span>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg rounded-tl-none p-4 max-w-[85%]">
                    <p className="text-sm text-foreground">
                      I&apos;ve reviewed your product launch project. There are 23
                      tasks, 4 are behind schedule, and the design team is waiting
                      on copy. Want me to restructure the timeline?
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-primary rounded-lg rounded-tr-none p-4 max-w-[80%]">
                    <p className="text-sm text-primary-foreground">
                      Yes. Push the design deadline by 2 days and reassign copywriting to Alex.
                    </p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg rounded-tl-none p-4 max-w-[85%]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Done</span>
                    </div>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <Sparkles className="w-3 h-3 text-primary" />
                        Timeline restructured
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <Sparkles className="w-3 h-3 text-primary" />
                        Alex assigned to copywriting
                      </li>
                      <li className="flex items-center gap-2 text-sm text-foreground">
                        <Sparkles className="w-3 h-3 text-primary" />
                        Stakeholders notified
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12"
        >
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            What Nova can do
          </h3>
          <p className="text-muted-foreground">
            Actions, not just answers. Nova works inside Theta.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-4xl mx-auto">
          {capabilities.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:border-primary/30 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground text-center leading-snug">
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
