"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Info } from "lucide-react";
import { SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { BILLING_PLANS, BillingInterval, getPlanPrice, getAnnualDiscount } from "@/lib/billing-plans";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function PricingPage() {
  const [interval, setBillingInterval] = useState<BillingInterval>("monthly");

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
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
            Powering Next-Gen Teams
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto px-4">
            Scale your engineering with Theta. Transparent pricing for teams of all sizes.
          </p>
        </motion.div>

        <div className="flex items-center justify-center gap-4 mb-12">
          <Label htmlFor="billing-cycle" className={`${interval === "monthly" ? "text-indigo-600 font-semibold" : "text-slate-500"}`}>Monthly</Label>
          <Switch
            id="billing-cycle"
            checked={interval === "annual"}
            onCheckedChange={(checked) => setBillingInterval(checked ? "annual" : "monthly")}
          />
          <Label htmlFor="billing-cycle" className={`${interval === "annual" ? "text-indigo-600 font-semibold" : "text-slate-500"}`}>
            Annual <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-1 font-bold">-{getAnnualDiscount()}%</span>
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-[1600px] mx-auto">
          {BILLING_PLANS.map((plan, i) => {
            const price = getPlanPrice(plan.id, interval);
            const displayPrice = plan.mode === "one_time"
              ? `$${plan.priceMonthlyUSD / 100}`
              : `$${interval === "annual" ? Math.floor(price / 12 / 100) : price / 100}`;

            const isPopular = plan.planKey === "pro";

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex"
              >
                <Card
                  className={`flex flex-col w-full relative overflow-hidden transition-all hover:shadow-xl ${isPopular
                    ? "border-2 border-indigo-600 shadow-lg ring-4 ring-indigo-50"
                    : "border-slate-200"
                    }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white px-4 py-1 text-xs font-bold uppercase tracking-wider rounded-bl-lg">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-slate-900">{plan.name}</CardTitle>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-4xl font-extrabold text-slate-900">{displayPrice}</span>
                      {plan.mode === "subscription" && (
                        <span className="text-slate-500 ml-1">/mo</span>
                      )}
                    </div>
                    {plan.mode === "subscription" && interval === "annual" && plan.priceMonthlyUSD > 0 && (
                      <p className="text-xs text-indigo-600 font-medium mt-1">Billed annually (${price / 100})</p>
                    )}
                    {plan.mode === "one_time" && (
                      <p className="text-xs text-slate-500 font-medium mt-1">One-time payment</p>
                    )}
                    <CardDescription className="mt-4 text-slate-600 min-h-[40px]">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col">
                    <div className="space-y-4 mb-8 flex-grow">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Everything in {i > 0 ? BILLING_PLANS[i - 1].name : 'Free'}:</p>
                      <ul className="space-y-3">
                        {plan.features.map((feature, j) => (
                          <li key={j} className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-full bg-green-100 p-0.5">
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </div>
                            <span className="text-sm text-slate-700 leading-tight">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <SignUpButton mode="modal">
                      <Button
                        className={`w-full py-6 text-base font-bold transition-all ${isPopular
                          ? "bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200"
                          : "bg-slate-900 hover:bg-slate-800"
                          }`}
                        variant="default"
                      >
                        {plan.planKey === "free" ? "Get Started" : plan.planKey === "lifetime" ? "Buy Lifetime" : "Upgrade Now"}
                      </Button>
                    </SignUpButton>
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

