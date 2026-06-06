"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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

export default function BillingPage() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [isInitializingPayment, setIsInitializingPayment] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const { activeWorkspaceId } = useWorkspace();

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["usage", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/billing/usage?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch usage");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

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
          planId, interval: billingInterval, currency: "NGN", workspaceId: activeWorkspaceId
        }),
      });
      const data = await response.json();
      if (data.url) { window.location.href = data.url; }
      else { throw new Error(data.error || "Failed to initialize payment"); }
    } catch (error: any) { toast.error(error.message); }
    finally { setIsInitializingPayment(null); }
  };

  const handleIvnoCheckout = async (planId: string) => {
    if (!activeWorkspaceId) return;
    setIsInitializingPayment(planId);
    try {
      const response = await fetch("/api/ivno/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval: billingInterval, workspaceId: activeWorkspaceId }),
      });
      const data = await response.json();
      if (data.url) { window.location.href = data.url; }
      else { throw new Error(data.error || "Failed to initialize payment"); }
    } catch (error: any) { toast.error(error.message); }
    finally { setIsInitializingPayment(null); }
  };

  if (usageLoading || subLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const workspace = subscription?.workspace;
  const currentPlanKey = workspace?.plan || "free";
  const billingStatus = workspace?.billingStatus || "active";
  const provider = workspace?.billingProvider;

  return (
    <div className="pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Billing & Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription, plans, and workspace limits
        </p>
        {billingStatus === "past_due" && (
          <Badge variant="destructive" className="mt-3 py-1.5 px-4 text-sm font-medium flex items-center gap-2 w-fit">
            <AlertCircle className="h-4 w-4" />
            Payment Past Due
          </Badge>
        )}
      </div>

      {workspace && (
        <Card className="border shadow-sm mb-8">
          <CardHeader className="pb-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold">{workspace.name}</h3>
                  <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-xs font-medium">
                    {currentPlanKey.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" />
                    {provider ? `via ${provider === 'paystack' ? 'Paystack' : 'Ivno'}` : 'No provider'}
                  </span>
                  {workspace.nextBillingDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Next: {format(new Date(workspace.nextBillingDate), "MMM do, yyyy")}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="capitalize font-medium rounded-md px-3 py-1">
                Status: {billingStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" /> Basic Usage
                </h4>
                <div className="space-y-3">
                  {usage?.projects && <UsageMeter {...usage.projects} label="Projects" />}
                  {usage?.tasks && <UsageMeter {...usage.tasks} label="Tasks" />}
                  {usage?.members && <UsageMeter {...usage.members} label="Members" />}
                  {usage?.calendar_events && <UsageMeter {...usage.calendar_events} label="Calendar Events" />}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Advanced Features
                </h4>
                <div className="space-y-3">
                  {usage?.boots && <UsageMeter {...usage.boots} label="AI Requests" />}
                  {usage?.storage && <UsageMeter {...usage.storage} label="File Storage" unit="MB" />}
                  {usage?.boards && <UsageMeter {...usage.boards} label="Kanban Boards" />}
                  {usage?.integrations && <UsageMeter {...usage.integrations} label="Integrations" />}
                  {usage?.automations && <UsageMeter {...usage.automations} label="Automations" />}
                  {usage?.chat_messages && <UsageMeter {...usage.chat_messages} label="Chat Messages" />}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-4 border-t text-xs text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <History className="h-3 w-3" />
              Last updated: {format(new Date(workspace.updatedAt), "PPpp")}
            </span>
          </CardFooter>
        </Card>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-xl font-semibold">Pick the right plan for you</h2>
          <p className="text-sm text-muted-foreground">Flexible pricing that grows with your team.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 p-2 border rounded-lg bg-muted/30 self-start">
          <div className="flex items-center gap-2 px-3 border-r">
            <button onClick={() => setCurrency("USD")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${currency === 'USD' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              USD
            </button>
            <button onClick={() => setCurrency("NGN")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${currency === 'NGN' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              NGN
            </button>
          </div>
          <div className="flex items-center gap-3 px-3">
            <span className={`text-sm font-medium ${billingInterval === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}>Monthly</span>
            <Switch checked={billingInterval === "annual"} onCheckedChange={(checked) => setBillingInterval(checked ? "annual" : "monthly")} />
            <span className={`text-sm font-medium ${billingInterval === 'annual' ? 'text-primary' : 'text-muted-foreground'}`}>Annual</span>
            <Badge variant="secondary" className="text-xs rounded-md px-2">
              SAVE 20%
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {BILLING_PLANS.map((plan, i) => {
          const isCurrentPlan = currentPlanKey === plan.planKey;
          const isPopular = plan.planKey === "pro";
          const currentMemberCount = usage?.members?.current || 0;
          const price = getPlanPrice(plan.id, billingInterval, currentMemberCount, currency);
          const formattedPrice = currency === "USD"
            ? `$${(price / 100).toLocaleString()}`
            : `₦${(price / 100).toLocaleString()}`;

          return (
            <Card key={plan.id}
              className={`border shadow-sm relative transition-all hover:shadow-md ${isCurrentPlan ? "ring-2 ring-primary" : ""} ${isPopular ? "border-primary/50" : ""}`}>
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 text-xs font-medium rounded-full shadow-sm z-10">
                  Recommended
                </div>
              )}
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-base font-semibold">{plan.name}</CardTitle>
                  {isCurrentPlan && <Badge variant="outline" className="text-xs rounded-md">Active</Badge>}
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold">{formattedPrice}</span>
                  {plan.mode === "subscription" && plan.basePriceMonthlyUSD > 0 && (
                    <span className="text-sm text-muted-foreground">
                      /{billingInterval === 'annual' ? 'yr' : 'mo'}
                    </span>
                  )}
                </div>
                {plan.mode === "subscription" && plan.basePriceMonthlyUSD > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {currency === "USD" ? `$${plan.basePriceMonthlyUSD / 100}` : `₦${(plan.basePriceMonthlyUSD / 100 * 1250).toLocaleString()}`} base + {currentMemberCount} {currentMemberCount === 1 ? 'user' : 'users'}
                  </div>
                )}
                <CardDescription className="mt-2 text-xs">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-5">
                <Separator className="mb-4" />
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${isCurrentPlan ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed" : ""}`}
                  variant={isCurrentPlan ? "secondary" : "default"}
                  disabled={isCurrentPlan || isInitializingPayment === plan.id}
                  onClick={() => {
                    if (currency === "USD") handleIvnoCheckout(plan.id);
                    else handlePaystackCheckout(plan.id);
                  }}
                >
                  {isInitializingPayment === plan.id ? "Starting..." :
                    isCurrentPlan ? "Current Plan" : "Upgrade" + (currency === "USD" && !subscription?.isIvnoConfigured ? " (Coming Soon)" : currency === "NGN" && !subscription?.isPaystackConfigured ? " (Coming Soon)" : "")}
                  {!isCurrentPlan && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-12 p-8 rounded-lg border bg-primary/5 text-center">
        <h3 className="text-lg font-semibold mb-2">Enterprise Scaling Needs?</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
          Custom solutions for large-scale operations with dedicated support and advanced security.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline">Contact Sales</Button>
          <Button variant="ghost">View Enterprise Roadmap &rarr;</Button>
        </div>
      </div>
    </div>
  );
}
