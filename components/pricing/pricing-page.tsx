"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Info } from "lucide-react";
import { SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { BILLING_PLANS, BillingInterval, getPlanPrice } from "@/lib/billing-plans";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function PricingPage() {
  const [interval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [teamSize, setTeamSize] = useState(1);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-background to-purple-500/10 pointer-events-none" />
      <nav className="container mx-auto px-4 py-4 sm:py-6 flex items-center justify-between">
        <Link href="/" className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Theta
        </Link>
        <div className="flex gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm">Features</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">Back to Home</Button>
          </Link>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent px-2 tracking-tight">
            Scalable Pricing for High-Output Teams
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Pay only for what you use. Base platform fee plus a small fee per active user.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto mb-16 p-8 glass rounded-3xl border-indigo-500/20 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <Check className="w-24 h-24 text-indigo-600" />
           </div>
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex-1 space-y-4">
                 <h2 className="text-2xl font-black tracking-tight text-indigo-600">Cost Estimator</h2>
                 <p className="text-sm font-medium text-muted-foreground italic">Drag to see how much you&apos;ll save on smaller teams or scale predictably as you grow.</p>
                 <div className="pt-4 space-y-6">
                    <div className="flex items-center justify-between">
                       <Label className="text-lg font-bold">Planned Team Size</Label>
                       <span className="text-3xl font-black text-indigo-600">{teamSize} {teamSize === 1 ? 'User' : 'Users'}</span>
                    </div>
                    <input 
                       type="range" 
                       min="1" 
                       max="100" 
                       value={teamSize} 
                       onChange={(e) => setTeamSize(parseInt(e.target.value))}
                       className="w-full h-3 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                 </div>
              </div>

              <div className="flex items-center justify-center gap-6 p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                <Label htmlFor="billing-cycle" className={`${interval === "monthly" ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-500"}`}>Monthly</Label>
                <Switch
                  id="billing-cycle"
                  checked={interval === "annual"}
                  onCheckedChange={(checked) => setBillingInterval(checked ? "annual" : "monthly")}
                />
                <div className="flex flex-col">
                   <Label htmlFor="billing-cycle" className={`${interval === "annual" ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-500"}`}>
                    Annual
                   </Label>
                   <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest mt-1">
                      -20% Overall
                   </span>
                </div>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1400px] mx-auto">
          {BILLING_PLANS.map((plan, i) => {
            const totalPrice = getPlanPrice(plan.id, interval, teamSize);
            const monthlyEquivalent = interval === "annual" ? Math.floor(totalPrice / 12) : totalPrice;
            
            const basePrice = plan.basePriceMonthlyUSD / 100;
            const perUserPrice = plan.perUserPriceMonthlyUSD / 100;

            const isPopular = plan.planKey === "pro";
            const isLimitExceeded = plan.maxUsers !== null && teamSize > plan.maxUsers;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex"
              >
                <Card
                  className={`flex flex-col w-full relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${isPopular
                    ? "border-2 border-indigo-600 shadow-xl"
                    : "border-slate-200"
                    } ${isLimitExceeded ? "opacity-50 grayscale select-none" : ""}`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-bl-lg">
                      Optimized for Growth
                    </div>
                  )}
                  {isLimitExceeded && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-white/20 backdrop-blur-[2px] text-center">
                       <Info className="h-12 w-12 text-indigo-600 mb-4" />
                       <h3 className="text-lg font-black uppercase italic text-indigo-900 leading-tight">Team Limit<br/>Reached</h3>
                       <p className="text-[10px] font-bold text-slate-600 mt-2">Max {plan.maxUsers} users</p>
                    </div>
                  )}
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-black tracking-tight text-foreground">{plan.name}</CardTitle>
                    <div className="mt-6 flex flex-col">
                       <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black text-foreground">${monthlyEquivalent / 100}</span>
                          <span className="text-muted-foreground font-bold text-xs">/mo</span>
                       </div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mt-2">
                          Estimated Cost
                       </p>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 space-y-1">
                       <p className="text-xs font-bold text-foreground">Pricing Structure:</p>
                       <p className="text-xs text-muted-foreground">
                          ${basePrice}/mo platform base
                       </p>
                       <p className="text-xs text-muted-foreground">
                          ${perUserPrice}/user per month
                       </p>
                    </div>
                    
                    <CardDescription className="mt-4 text-[13px] font-medium text-muted-foreground min-h-[40px] leading-relaxed">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col">
                    <div className="space-y-4 mb-8 flex-grow">
                      <ul className="space-y-3">
                        {plan.features.map((feature, j) => (
                          <li key={j} className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 p-0.5">
                              <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400 stroke-[3px]" />
                            </div>
                            <span className="text-[13px] text-foreground/80 font-medium leading-tight">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <SignedOut>
                      <SignUpButton mode="modal">
                        <Button
                          className={`w-full py-6 text-sm font-black uppercase tracking-widest transition-all rounded-2xl ${isPopular
                            ? "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                            : "bg-primary hover:bg-primary/90"
                            }`}
                          variant="default"
                          disabled={isLimitExceeded}
                        >
                          {plan.planKey === "free" ? "Get Started" : "Select Plan"}
                        </Button>
                      </SignUpButton>
                    </SignedOut>
                    <SignedIn>
                      <Link href="/dashboard" className="w-full">
                        <Button
                          className={`w-full py-6 text-sm font-black uppercase tracking-widest transition-all rounded-2xl ${isPopular
                            ? "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                            : "bg-primary hover:bg-primary/90"
                            }`}
                          variant="default"
                          disabled={isLimitExceeded}
                        >
                          {plan.planKey === "free" ? "Go to Dashboard" : "Upgrade Plan"}
                        </Button>
                      </Link>
                    </SignedIn>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-20 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm mb-6">
            <Info className="h-4 w-4 text-indigo-600" />
            <span className="text-sm text-slate-600 font-medium font-sans">Need a custom plan for 500+ members?</span>
          </div>
          <p className="text-slate-500 text-sm">
            All plans include SSL security and 99.9% uptime SLA.
            Prices are in USD. 30-day money back guarantee on all paid plans.
          </p>
        </div>
      </section>
    </div>
  );
}

