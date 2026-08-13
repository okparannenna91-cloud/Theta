"use client";

import { Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePopups } from "@/components/popups/popup-manager";

interface PremiumFeatureGateProps {
  feature: string;
  title: string;
  description: string;
  ctaLabel: string;
}

export function PremiumFeatureGate({ feature, title, description, ctaLabel }: PremiumFeatureGateProps) {
  const { showUpgradePrompt } = usePopups();

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto">
      <Card className="border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl py-20 flex flex-col items-center justify-center text-center shadow-xl shadow-primary/5">
        <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 text-primary shadow-inner">
          <Lock className="h-10 w-10" />
        </div>
        <Badge className="bg-primary mb-4 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Premium Feature</Badge>
        <h2 className="text-3xl font-black tracking-tight mb-3">{title}</h2>
        <p className="text-muted-foreground text-sm max-w-md mb-10 leading-relaxed font-medium">
          {description}
        </p>
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 h-14 px-10 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs translate-y-0 hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
          onClick={() => showUpgradePrompt(feature)}
        >
          <Sparkles className="h-5 w-5 mr-3" />
          {ctaLabel}
        </Button>
      </Card>
    </div>
  );
}
