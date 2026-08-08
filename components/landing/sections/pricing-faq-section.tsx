"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    desc: "Get started with the core features you need.",
    features: ["Up to 10 team members", "3 projects", "Basic analytics", "500MB storage"],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Growth",
    price: "$12",
    period: "/month",
    desc: "For growing teams that need more power and room to scale.",
    features: ["Unlimited team members", "Unlimited projects", "Advanced analytics", "10GB storage", "Priority support"],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    desc: "Advanced features for professional teams with demanding workflows.",
    features: ["Everything in Growth", "Advanced automation", "Unlimited storage", "API access"],
    cta: "Start Free Trial",
    popular: false,
  },
];

type FaqItem = {
  q: string;
  a: string;
};

const faqs: FaqItem[] = [
  {
    q: "What makes Theta different from Jira or Asana?",
    a: "Theta is a PM-native workspace built for how modern teams work. Flexible boards, sprints, timelines, docs, and chat live in one place — fast, clean, and ready to use in minutes. No bloat, no rigidity, no tools that fight you.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The Free plan includes core project management features with up to 10 team members and 3 projects. No credit card required.",
  },
  {
    q: "Can I invite my entire team?",
    a: "Absolutely. The Growth and Pro plans support unlimited team members with role-based permissions. You can invite members via secure links.",
  },
  {
    q: "Is there a learning curve?",
    a: "No. Boards, lists, timelines, calendars, and dashboards work the way you expect — your team is productive from day one, no training required.",
  },
  {
    q: "Is my workspace private?",
    a: "Yes. Every workspace is fully isolated with strict tenant separation. Your data is encrypted at rest and in transit and is never shared across workspaces.",
  },
  {
    q: "Which payment methods are supported?",
    a: "We accept major credit cards, debit cards, and select local payment methods depending on your region. All payments are processed securely.",
  },
  {
    q: "Can I customize workflows to fit my team?",
    a: "Yes. Tailor boards, fields, and views to match how your team works — no rigid templates, no forced processes.",
  },
  {
    q: "Which project views are included?",
    a: "Board, list, timeline, calendar, and dashboard views come standard. Switch between them anytime to see your work the way you prefer.",
  },
];

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-xl border bg-card overflow-hidden hover:border-primary/30 transition-colors"
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between p-5 text-left"
          >
            <span className="text-sm font-semibold text-foreground pr-4">{item.q}</span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
                openIndex === i ? "rotate-180" : ""
              }`}
            />
          </button>
          <AnimatePresence>
            {openIndex === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function PricingFaqSection() {
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
            Simple pricing.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              Plans that grow with you
            </span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Start free. Upgrade as you grow. Get more features, storage, and support
            as your team scales.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`relative p-6 rounded-xl border ${
                plan.popular
                  ? "border-primary shadow-lg shadow-primary/10 bg-card"
                  : "border bg-card hover:border-primary/30"
              } transition-all`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{plan.desc}</p>
              </div>

              <ul className="space-y-2.5 mb-6">
                {plan.features.map((feat, j) => (
                  <li key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <Link href="/sign-up">
                <Button
                  className={`w-full h-10 rounded-lg text-xs font-medium ${
                    plan.popular
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                      : "bg-muted/50 hover:bg-muted text-foreground border"
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mb-16">
          <Link href="/pricing">
            <Button variant="outline" className="h-10 px-6 rounded-lg text-sm font-medium">
              View Full Pricing
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-3xl mx-auto"
        >
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-8 tracking-tight">
            Frequently asked questions
          </h3>
          <FaqAccordion items={faqs} />
        </motion.div>
      </div>
    </section>
  );
}
