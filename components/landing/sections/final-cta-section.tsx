"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Zap, Brain, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FinalCtaSection() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] to-background pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-gradient-to-r from-primary/5 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative bg-gradient-to-br from-primary/5 via-card to-purple-500/5 rounded-2xl border p-10 sm:p-16 text-center overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-8 border border-primary/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Start shipping faster today
            </motion.div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight tracking-tight">
              Build Faster.
              <br />
              Stay Organized.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
                Let Nova handle the busy work.
              </span>
            </h2>

            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              Theta combines powerful project management with an intelligent AI teammate
              that works alongside your entire team. One workspace. One teammate. Endless
              possibilities.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium shadow-md shadow-primary/20"
                >
                  Start Free
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 rounded-lg text-sm font-medium"
                asChild
              >
                <Link href="/pricing">View Pricing</Link>
              </Button>
              <Link href="/sign-in">
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-12 px-8 rounded-lg text-sm font-medium"
                >
                  Sign In
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-primary" />
                Nova included
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-500" />
                Secure workspace
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
