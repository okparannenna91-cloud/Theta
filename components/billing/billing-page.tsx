
"use client";

import React, { useState, useEffect } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Star, Check, Zap, CreditCard, Calendar, Globe, AlertCircle,
  ExternalLink, ArrowRight, ShieldCheck, History
} from "lucide-react";
import { toast } from "sonner";

import { useWorkspace } from "@/hooks/use-workspace";
import {
  BILLING_PLANS,
  BillingInterval,
  Currency,
  getPlanPrice
} from "@/lib/billing-plans";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageMeter } from "./usage-meter";

// Helper to push to FastSpring
const pushFastSpring = (productPath: string, workspaceId: string) => {
  if (typeof window !== 'undefined' && (window as any).fastspring) {
    (window as any).fastspring.builder.push({
      products: [{ path: productPath, quantity: 1 }],
      tags: { workspaceId: workspaceId },
    });
  } else {
    console.error("FastSpring SBL not loaded");
    toast.error("Payment system is initializing. Please try again.");
  }
};

export default function BillingPage() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [isInitializingPayment, setIsInitializingPayment] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const { activeWorkspaceId } = useWorkspace();

  // Fetch Usage
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["usage", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/billing/usage?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch usage");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  // Fetch Subscription
  const { data: subscription, isLoading: subLoading, refetch: refetchSub } = useQuery({
    queryKey: ["subscription", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/billing/subscription?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
    refetchInterval: 30000,
  });


  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      toast.success("Payment successful! Your plan is being updated.");
      refetchSub();
    }
  }, [searchParams, refetchSub]);

  const handlePaystackCheckout = async (planId: string) => {
    if (!activeWorkspaceId) return;

    setIsInitializingPayment(planId);
    try {
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          interval: billingInterval,
          currency: "NGN",
          workspaceId: activeWorkspaceId
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to initialize payment");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsInitializingPayment(null);
    }
  };

  if (usageLoading || subLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const workspace = subscription?.workspace;
  const currentPlanKey = workspace?.plan || "free";
  const billingStatus = workspace?.billingStatus || "active";
  const provider = workspace?.billingProvider;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* FastSpring SBL Script */}
      <Script
        id="fsc-api"
        src="https://d1f8f9xcsvx3ha.cloudfront.net/sbl/0.8.5/fastspring-builder.min.js"
        type="text/javascript"
        data-storefront="theta-saas.test.onfastspring.com/popup-theta"
        strategy="lazyOnload"
      />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Billing & Plans</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription, plans, and workspace limits.
          </p>
        </div>

        {billingStatus === "past_due" && (
          <Badge variant="destructive" className="animate-pulse py-1.5 px-4 text-sm font-bold flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Payment Past Due - Please Update Billing
          </Badge>
        )}
      </motion.div>

      {/* Current Plan Overview Card */}
      {workspace && (
        <Card className={`border-2 overflow-hidden shadow-sm ${billingStatus === "past_due" ? "border-red-200 bg-red-50/10" : "border-indigo-100 bg-indigo-50/20"
          }`}>
          <CardHeader className="pb-4 bg-white/50 backdrop-blur-sm border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold">Workspace: {workspace.name}</h3>
                  <Badge className="bg-indigo-600 hover:bg-indigo-700 font-bold">
                    {currentPlanKey.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" />
                    {provider ? `via ${provider === 'paystack' ? 'Paystack' : 'FastSpring'}` : 'No provider'}
                  </span>
                  {workspace.nextBillingDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Next Billing: {format(new Date(workspace.nextBillingDate), "MMM do, yyyy")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`capitalize font-bold border-2 ${billingStatus === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                    billingStatus === 'past_due' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                >
                  Status: {billingStatus}
                </Badge>
                {provider === "fastspring" && (
                  <Button variant="outline" size="sm" onClick={() => window.open("https://theta-saas.test.onfastspring.com/account", "_blank")}>
                    Manage <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-indigo-900 flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Core Resources
                  </h4>
                </div>
                <div className="space-y-4">
                  {usage?.projects && <UsageMeter {...usage.projects} label="Projects" />}
                  {usage?.tasks && <UsageMeter {...usage.tasks} label="Tasks" />}
                  {usage?.members && <UsageMeter {...usage.members} label="Members" />}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-sm uppercase tracking-wider text-indigo-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> AI & Advanced Features
                </h4>
                <div className="space-y-4">
                  {usage?.bootsRequests && <UsageMeter {...usage.bootsRequests} label="Boots AI Requests" />}
                  {usage?.storage && <UsageMeter {...usage.storage} label="File Storage" unit="MB" />}
                  {usage?.boards && <UsageMeter {...usage.boards} label="Kanban Boards" />}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/50 p-4 border-t flex justify-between items-center">
            <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-2">
              <History className="h-3 w-3" />
              Last updated: {format(new Date(workspace.updatedAt), "PPpp")}
            </div>
            {provider === "paystack" && (
              <p className="text-[10px] text-muted-foreground">
                Subscription managed in-app via Paystack Security
              </p>
            )}
          </CardFooter>
        </Card>
      )}

      {/* Plan Selection Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-4">
        <div>
          <h2 className="text-2xl font-bold">Pick the right plan for you</h2>
          <p className="text-muted-foreground text-sm">Flexible pricing that grows with your team size and ambitions.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-2xl border shadow-sm self-start lg:self-center">
          {/* Currency Toggle */}
          <div className="flex items-center gap-3 px-3 border-r mr-1">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setCurrency("USD")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${currency === 'USD' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >USD</button>
              <button
                onClick={() => setCurrency("NGN")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${currency === 'NGN' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >NGN</button>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3">
            <span className={`text-sm font-bold ${billingInterval === 'monthly' ? 'text-indigo-600' : 'text-slate-500'}`}>Monthly</span>
            <Switch
              checked={billingInterval === "annual"}
              onCheckedChange={(checked) => setBillingInterval(checked ? "annual" : "monthly")}
            />
            <span className={`text-sm font-bold ${billingInterval === 'annual' ? 'text-indigo-600' : 'text-slate-500'}`}>Annual</span>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-black text-[10px] px-2 ml-2">
              SAVE 20%
            </Badge>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {BILLING_PLANS.map((plan, i) => {
          const isCurrentPlan = currentPlanKey === plan.planKey;
          const isPopular = plan.planKey === "pro";

          const fsPath = plan.fastSpringPaths
            ? (billingInterval === 'annual' ? plan.fastSpringPaths.annual : plan.fastSpringPaths.monthly)
            : null;

          const price = getPlanPrice(plan.id, billingInterval, currency);

          const formattedPrice = currency === "USD"
            ? `$${(price / 100).toLocaleString()}`
            : `₦${(price / 100).toLocaleString()}`;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex"
            >
              <Card className={`flex flex-col w-full relative transition-all duration-300 hover:shadow-2xl group cursor-default ${isCurrentPlan ? "border-indigo-600 ring-4 ring-indigo-50 bg-indigo-50/5" :
                isPopular ? "border-indigo-200 shadow-md" : "border-slate-200"
                }`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg z-10">
                    Recommended
                  </div>
                )}

                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-xl font-bold tracking-tight">{plan.name}</CardTitle>
                    {isCurrentPlan && <Badge className="bg-indigo-600/10 text-indigo-600 border-indigo-200 shadow-none">Active</Badge>}
                  </div>

                  <div className="flex items-baseline flex-wrap gap-1 mt-2">
                    <span className="text-3xl sm:text-4xl font-black tracking-tighter break-all">
                      {formattedPrice}
                    </span>
                    {plan.mode === "subscription" && plan.priceMonthlyUSD > 0 && (
                      <span className="text-slate-400 text-sm font-semibold ml-1">
                        /{billingInterval === 'annual' ? 'yr' : 'mo'}
                      </span>
                    )}
                  </div>
                  <CardDescription className="mt-4 text-xs font-medium leading-relaxed min-h-[40px]">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col flex-grow pt-0 pb-8">
                  <Separator className="mb-6 opacity-30" />
                  <ul className="space-y-3.5 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-xs">
                        <div className="flex-shrink-0 bg-green-50 rounded-full p-0.5">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                        <span className="text-slate-600 font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto">
                    <Button
                      className={`w-full font-black py-6 transition-all duration-300 ${isCurrentPlan || (currency === "USD" && !subscription?.isFastSpringConfigured)
                        ? "bg-slate-100 text-slate-500 hover:bg-slate-100 border-none cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 shadow-lg translate-y-0 hover:-translate-y-1 active:translate-y-0"
                        }`}
                      variant={isCurrentPlan ? "secondary" : "default"}
                      disabled={isCurrentPlan || isInitializingPayment === plan.id || (currency === "USD" && !subscription?.isFastSpringConfigured)}
                      onClick={() => {
                        if (currency === "USD") {
                          if (fsPath && activeWorkspaceId) pushFastSpring(fsPath, activeWorkspaceId);
                        } else {
                          handlePaystackCheckout(plan.id);
                        }
                      }}
                    >
                      {isInitializingPayment === plan.id ? "Initializing..." :
                        isCurrentPlan ? "Current Active Plan" :
                          (currency === "USD" && !subscription?.isFastSpringConfigured) ? "Checkout Coming Soon" :
                            plan.planKey === "lifetime" ? "Get Lifetime" :
                              "Upgrade Now"}
                      {!isCurrentPlan && !(currency === "USD" && !subscription?.isFastSpringConfigured) && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-col items-center text-center py-12">
        <div className="bg-indigo-900 text-white p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-200/50 max-w-4xl w-full relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-3xl opacity-50" />

          <Zap className="h-10 w-10 text-indigo-400 mx-auto mb-6" />
          <h3 className="text-3xl font-black mb-4">Enterprise Scaling Needs?</h3>
          <p className="text-indigo-200 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            Join 500+ teams using Theta for enterprise-grade automation, advanced security,
            and dedicated success management. Custom solutions for large-scale operations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold px-8 py-6 rounded-xl">
              Contact Sales
            </Button>
            <Button variant="ghost" className="text-indigo-100 font-bold px-8">
              View Enterprise Roadmap &rarr;
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
