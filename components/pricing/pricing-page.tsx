"use client";

import { useState } from "react";
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
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-foreground">
            Theta
          </Link>
          <div className="flex gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-sm">Features</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm" className="text-sm">Back to Home</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Scalable Pricing for High-Output Teams
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pay only for what you use. Base platform fee plus a small fee per active user.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-12 p-6 rounded-lg border shadow-sm bg-card relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Cost Estimator</h2>
              <p className="text-sm text-muted-foreground">Drag to estimate your monthly cost as your team grows.</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Team Size</Label>
                  <span className="text-2xl font-bold text-foreground">{teamSize} {teamSize === 1 ? 'User' : 'Users'}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  value={teamSize} 
                  onChange={(e) => setTeamSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
              <span className={`text-sm font-medium ${interval === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
              <Switch
                id="billing-cycle"
                checked={interval === "annual"}
                onCheckedChange={(checked) => setBillingInterval(checked ? "annual" : "monthly")}
              />
              <div className="flex flex-col items-start">
                <span className={`text-sm font-medium ${interval === "annual" ? "text-foreground" : "text-muted-foreground"}`}>Annual</span>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium mt-0.5">
                  -20%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-[1400px] mx-auto">
          {BILLING_PLANS.map((plan, i) => {
            const totalPrice = getPlanPrice(plan.id, interval, teamSize);
            const monthlyEquivalent = interval === "annual" ? Math.floor(totalPrice / 12) : totalPrice;
            
            const basePrice = plan.basePriceMonthlyUSD / 100;
            const perUserPrice = plan.perUserPriceMonthlyUSD / 100;

            const isPopular = plan.planKey === "pro";
            const isLimitExceeded = plan.maxUsers !== null && teamSize > plan.maxUsers;

            return (
              <Card key={plan.id}
                className={`flex flex-col relative overflow-hidden border transition-all hover:shadow-md ${isPopular ? "ring-2 ring-primary" : ""} ${isLimitExceeded ? "opacity-50" : ""}`}
              >
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-0.5 text-[10px] font-medium rounded-bl">
                    Recommended
                  </div>
                )}
                {isLimitExceeded && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-background/80 backdrop-blur-[1px] text-center">
                    <Info className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-semibold text-foreground">Team limit reached</p>
                    <p className="text-xs text-muted-foreground mt-1">Max {plan.maxUsers} users</p>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">${monthlyEquivalent / 100}</span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Estimated total cost</p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t space-y-1">
                    <p className="text-xs text-muted-foreground">${basePrice}/mo platform base</p>
                    <p className="text-xs text-muted-foreground">${perUserPrice}/user per month</p>
                  </div>
                  
                  <CardDescription className="mt-3 text-sm text-muted-foreground">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                  <div className="space-y-3 mb-6 flex-grow">
                    <ul className="space-y-2">
                      {plan.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <div className="mt-0.5 rounded-full bg-primary/10 p-0.5">
                            <Check className="h-3 w-3 text-primary stroke-[3px]" />
                          </div>
                          <span className="text-xs text-foreground/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <SignedOut>
                    <SignUpButton mode="modal">
                      <Button
                        className={`w-full text-sm font-medium rounded-lg ${isPopular ? "bg-primary hover:bg-primary/90 shadow-sm" : ""}`}
                        variant={isPopular ? "default" : "outline"}
                        disabled={isLimitExceeded}
                      >
                        {plan.planKey === "free" ? "Get Started" : "Select Plan"}
                      </Button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <Link href="/dashboard" className="w-full">
                      <Button
                        className={`w-full text-sm font-medium rounded-lg ${isPopular ? "bg-primary hover:bg-primary/90 shadow-sm" : ""}`}
                        variant={isPopular ? "default" : "outline"}
                        disabled={isLimitExceeded}
                      >
                        {plan.planKey === "free" ? "Go to Dashboard" : "Upgrade Plan"}
                      </Button>
                    </Link>
                  </SignedIn>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-card shadow-sm mb-4">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Need a custom plan for 500+ members?</span>
          </div>
          <p className="text-sm text-muted-foreground">
            All plans include SSL security and 99.9% uptime SLA. Prices in USD. 30-day money back guarantee.
          </p>
        </div>
      </section>
    </div>
  );
}
