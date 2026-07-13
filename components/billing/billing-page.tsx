"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Star, Check, Zap, CreditCard, Calendar, Globe, AlertCircle,
  ExternalLink, ArrowRight, ShieldCheck, History, ArrowDown, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

import { useWorkspace } from "@/hooks/use-workspace";
import { useSubscription } from "@/hooks/use-subscription";
import { useInvoices } from "@/hooks/use-invoices";
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageMeter } from "./usage-meter";
import { SubscriptionStatusBanner } from "./subscription-status-banner";
import { InvoiceList } from "./invoice-list";
import { CancelSubscriptionDialog } from "./cancel-subscription-dialog";
import { ChangePlanDialog } from "./change-plan-dialog";
import { CreditBalance } from "./credit-balance";
import { PaymentProviderModal, PAYMENT_PROVIDERS, PriceBreakdown } from "./payment-provider-modal";

export default function BillingPage() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [isInitializingPayment, setIsInitializingPayment] = useState<string | null>(null);
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<{ planId: string; price: string; name: string } | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);

  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const activeWorkspaceIdRef = useRef(activeWorkspaceId);
  useEffect(() => { activeWorkspaceIdRef.current = activeWorkspaceId; }, [activeWorkspaceId]);
  const { subscription, isLoading: subLoading, refetch: refetchSub, cancelSubscription, reactivateSubscription, retryPayment, isRetrying, isCancelling } = useSubscription();

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["usage", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/billing/usage?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch usage");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices();

  const changePlanMutation = useMutation({
    mutationFn: async (params: { workspaceId: string; newPlanKey: string; newInterval?: string }) => {
      const res = await fetch("/api/billing/subscription/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to change plan");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscription", activeWorkspaceIdRef.current] });
      if (data.direction === "upgrade") {
        toast.success(`Upgraded! Charged ${(data.chargeAmount / 100).toFixed(2)} (prorated)`);
      } else {
        toast.success("Downgrade scheduled for end of billing period");
      }
      refetchSub();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      toast.success("Payment successful! Your plan is being updated.");
      refetchSub();
    }
  }, [searchParams, refetchSub]);

  const executeCheckout = async (planId: string, provider?: string) => {
    const wsId = activeWorkspaceIdRef.current;
    if (!wsId) return;
    setIsInitializingPayment(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          interval: billingInterval,
          currency,
          workspaceId: wsId,
          ...(provider ? { provider } : {}),
        }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("json")) {
        const text = await res.text();
        throw new Error(`Checkout API returned ${res.status} (expected JSON). Please check that the payment provider is configured correctly.`);
      }
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { throw new Error(data.error || "Failed to initialize payment"); }
    } catch (error: any) { toast.error(error.message); }
    finally { setIsInitializingPayment(null); }
  };

  const handleCheckout = async (planId: string, price: string, name: string) => {
    if (!activeWorkspaceId) return;
    if (currency === "NGN") {
      executeCheckout(planId);
    } else {
      setPendingCheckout({ planId, price, name });
      setProviderModalOpen(true);
      try {
        const res = await fetch(`/api/billing/checkout/breakdown?workspaceId=${activeWorkspaceId}&planId=${planId}&interval=${billingInterval}&currency=${currency}`);
        if (res.ok) {
          const data = await res.json();
          setPriceBreakdown(data);
        }
      } catch { /* breakdown is non-critical */ }
    }
  };

  const handleProviderSelect = async (providerId: string) => {
    if (!pendingCheckout) return;
    setProviderModalOpen(false);
    setPendingCheckout(null);
    await executeCheckout(pendingCheckout.planId, providerId);
  };

  const handleCancel = async (immediate: boolean, reason?: string) => {
    if (!activeWorkspaceId) return;
    await cancelSubscription({ workspaceId: activeWorkspaceId, immediate, reason });
  };

  const handleChangePlan = async (newPlanKey: string, newInterval?: string) => {
    if (!activeWorkspaceId) return;
    await changePlanMutation.mutateAsync({ workspaceId: activeWorkspaceId, newPlanKey, newInterval: newInterval ?? billingInterval });
  };

  if (usageLoading || subLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const currentPlanKey = subscription?.plan || "free";
  const billingStatus = subscription?.status || "active";
  const provider = subscription?.provider;
  const workspaceName = activeWorkspace?.name;
  const isPaidPlan = currentPlanKey !== "free";

  return (
    <div className="pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Billing & Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription, plans, and workspace limits
        </p>
      </div>

      <SubscriptionStatusBanner
        status={billingStatus}
        trialDaysRemaining={subscription?.trialDaysRemaining}
        cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd}
        currentPeriodEnd={subscription?.currentPeriodEnd ?? undefined}
        onRetry={() => activeWorkspaceId && retryPayment(activeWorkspaceId)}
        onReactivate={() => activeWorkspaceId && reactivateSubscription(activeWorkspaceId)}
        isLoading={isRetrying}
      />

      {workspaceName && (
        <Card className="border shadow-sm mb-8">
          <CardHeader className="pb-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold">{workspaceName}</h3>
                  <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-xs font-medium">
                    {currentPlanKey.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" />
                    {provider ? `via ${provider === 'paystack' ? 'Paystack' : provider === 'ivno' ? 'Ivno' : provider}` : 'No provider'}
                  </span>
                  {subscription?.currentPeriodEnd && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Next: {format(new Date(subscription.currentPeriodEnd), "MMM do, yyyy")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPaidPlan && billingStatus === "active" && !subscription?.cancelAtPeriodEnd && (
                  <CancelSubscriptionDialog
                    onCancel={handleCancel}
                    isCancelling={isCancelling}
                    hasActiveSubscription={true}
                  />
                )}
                <Badge variant="outline" className="capitalize font-medium rounded-md px-3 py-1">
                  Status: {billingStatus}
                </Badge>
              </div>
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
                  {usage?.nova && <UsageMeter {...usage.nova} label="AI Requests" />}
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
              {usage?.updatedAt ? `Last updated: ${format(new Date(usage.updatedAt), "PPpp")}` : "Usage data"}
            </span>
          </CardFooter>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-4 mb-8">
        <div className="lg:col-span-3">
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
              const isFree = plan.planKey === "free";
              const currentMemberCount = usage?.members?.current || 0;
              const price = getPlanPrice(plan.id, billingInterval, currentMemberCount, currency);
              const formattedPrice = currency === "USD"
                ? `$${(price / 100).toLocaleString()}`
                : `₦${(price / 100).toLocaleString()}`;

              const isUpgrade = plan.basePriceMonthlyUSD > (BILLING_PLANS.find(p => p.planKey === currentPlanKey)?.basePriceMonthlyUSD ?? 0);

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
                    {isCurrentPlan ? (
                      <Button
                        className="w-full bg-muted text-muted-foreground cursor-default"
                        variant="secondary"
                        disabled
                      >
                        Current Plan
                      </Button>
                    ) : isFree && isPaidPlan ? (
                      <div className="space-y-2">
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => executeCheckout(plan.id)}
                          disabled={isInitializingPayment === plan.id}
                        >
                          <ArrowDown className="h-4 w-4 mr-1" />
                          {isInitializingPayment === plan.id ? "Starting..." : "Switch to Free"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {isUpgrade ? (
                          <Button
                            className="w-full"
                            variant="default"
                            onClick={() => handleCheckout(plan.id, formattedPrice, plan.name)}
                            disabled={isInitializingPayment === plan.id}
                          >
                            {isInitializingPayment === plan.id ? "Starting..." : "Upgrade"}
                            {isInitializingPayment !== plan.id && <ArrowRight className="ml-2 h-4 w-4" />}
                          </Button>
                        ) : (
                          <ChangePlanDialog
                            currentPlan={currentPlanKey}
                            targetPlan={{
                              planKey: plan.planKey,
                              name: plan.name,
                              price,
                              formattedPrice,
                              isUpgrade: false,
                            }}
                            onConfirm={() => handleChangePlan(plan.planKey, billingInterval)}
                            isChanging={changePlanMutation.isPending}
                          />
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <CreditBalance />
          {subscription?.dunningLevel != null && subscription.dunningLevel > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" /> Dunning Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-600">
                  Retry level {subscription.dunningLevel} of 3. Your subscription will be deactivated if payment fails again.
                </p>
              </CardContent>
            </Card>
          )}
          {subscription?.cancelAtPeriodEnd && subscription?.currentPeriodEnd && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700">
                  <Calendar className="h-4 w-4" /> Cancellation Scheduled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-600">
                  Your subscription ends on {format(new Date(subscription.currentPeriodEnd), "MMM do, yyyy")}.
                </p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => activeWorkspaceId && reactivateSubscription(activeWorkspaceId)}>
                  Reactivate
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-12 space-y-8">
        {invoicesData && (
          <InvoiceList
            invoices={invoicesData.invoices || []}
            total={invoicesData.total || 0}
            isLoading={invoicesLoading}
          />
        )}

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Payment Methods</CardTitle>
            <CardDescription>Manage your saved payment methods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <CreditCard className="h-8 w-8 mr-3 text-muted-foreground/50" />
              <span>Payment method management coming soon</span>
            </div>
          </CardContent>
        </Card>
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

      <PaymentProviderModal
        open={providerModalOpen}
        onOpenChange={(open) => { setProviderModalOpen(open); if (!open) setPriceBreakdown(null); }}
        planName={pendingCheckout?.name || ""}
        planPrice={pendingCheckout?.price || ""}
        breakdown={priceBreakdown}
        onSelectProvider={handleProviderSelect}
      />
    </div>
  );
}
