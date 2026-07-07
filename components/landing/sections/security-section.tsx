"use client";

import { motion } from "framer-motion";
import {
  Shield,
  Lock,
  Key,
  Server,
  Users,
  EyeOff,
  CheckCircle2,
} from "lucide-react";

const securityItems = [
  {
    icon: Shield,
    title: "Workspace isolation",
    desc: "Each workspace is fully isolated. Zero cross-tenant data leakage — guaranteed.",
  },
  {
    icon: Lock,
    title: "Encrypted data",
    desc: "All data encrypted at rest and in transit using industry-standard protocols.",
  },
  {
    icon: Key,
    title: "Secure authentication",
    desc: "Multi-factor authentication and OAuth 2.0 with PKCE for maximum account security.",
  },
  {
    icon: Server,
    title: "Reliable infrastructure",
    desc: "Built on Next.js with MongoDB Atlas. 99.9% uptime SLA for every workspace.",
  },
  {
    icon: Users,
    title: "Role-based permissions",
    desc: "Granular access control. Define who can view, edit, or manage each resource.",
  },
  {
    icon: EyeOff,
    title: "Privacy-first architecture",
    desc: "Nova operates within your permissions. Your data stays yours — always.",
  },
];

export default function SecuritySection() {
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
            Security &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              reliability
            </span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Trust is built into every layer. Your workspace, your data — protected.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="p-5 rounded-xl border bg-card hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mt-12 p-6 rounded-xl border-2 border-emerald-500/20 bg-emerald-500/5 text-center max-w-3xl mx-auto"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Nova works within your permissions
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Nova only accesses what you authorize. It respects workspace boundaries,
            role-based permissions, and never shares data across workspaces.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
