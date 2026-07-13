"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Check, Zap, CreditCard, Calendar,
  ArrowRight, ArrowDown, AlertTriangle,
  Users, FolderKanban, HardDrive, Bot, Headphones, Sparkles,
  ChevronRight, Gauge
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useWorkspace } from "@/hooks/use-workspace";
import { useSubscription } from "@/hooks/use-subscription";
import { useInvoices } from "@/hooks/use-invoices";
import {
  BILLING_PLANS,
  BillingInterval,
  Currency,
  getPlanPrice
} from "@/lib/billing-plans";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { SubscriptionStatusBanner } from "./subscription-status-banner";
import { InvoiceList } from "./invoice-list";
import { CancelSubscriptionDialog } from "./cancel-subscription-dialog";
import { ChangePlanDialog } from "./change-plan-dialog";
import { CreditBalance } from "./credit-balance";
import { PaymentProviderModal, PriceBreakdown } from "./payment-provider-modal";

type FeatureGroup = { key: string; label: string; icon: React.ReactNode; features: string[] };

const groupKey = (feature: string): { key: string; label: string; icon: React.ReactNode } => {
  const lc = feature.toLowerCase();
  if (/\b(user|team|member)\b/.test(lc)) return { key: "workspace", label: "Workspace", icon: <Users className="h-3.5 w-3.5" /> };
  if (/\b(project|task|board)\b/.test(lc)) return { key: "projects", label: "Projects & Tasks", icon: <FolderKanban className="h-3.5 w-3.5" /> };
  if (/\b(storage|mb|gb)\b/.test(lc)) return { key: "storage", label: "Storage", icon: <HardDrive className="h-3.5 w-3.5" /> };
  if (/\b(ai|nova)\b/.test(lc)) return { key: "ai", label: "AI", icon: <Bot className="h-3.5 w-3.5" /> };
  if (/\b(support|email|chat)\b/.test(lc)) return { key: "support", label: "Support", icon: <Headphones className="h-3.5 w-3.5" /> };
  if (/\b(integration|analytics|api|permission|automation)\b/.test(lc)) return { key: "advanced", label: "Advanced", icon: <Gauge className="h-3.5 w-3.5" /> };
  return { key: "enterprise", label: "Enterprise", icon: <Sparkles className="h-3.5 w-3.5" /> };
};

function groupFeatures(features: string[]): FeatureGroup[] {
  const groups = new Map<string, FeatureGroup>();
  for (const f of features) {
    const { key, label, icon } = groupKey(f);
    if (!groups.has(key)) groups.set(key, { key, label, icon, features: [] });
    groups.get(key)!.features.push(f);
  }
  const order = ["workspace", "projects", "storage", "ai", "advanced", "support", "enterprise"];
  return order.map(k => groups.get(k)).filter(Boolean) as FeatureGroup[];
}

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
    const checkout = pendingCheckout;
    if (!checkout) return;
    setProviderModalOpen(false);
    setPendingCheckout(null);
    await executeCheckout(checkout.planId, providerId);
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
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
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
    <div className="pb-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Billing & Plans</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Manage your subscription and choose the right plan for your team
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
        <div className="mb-10 p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold">{workspaceName}</h3>
                <Badge variant="secondary" className="rounded-md px-2.5 py-0.5 text-xs font-medium">
                  {currentPlanKey === "free" ? "FREE" : currentPlanKey === "growth" ? "GROWTH" : currentPlanKey === "pro" ? "PRO" : "THETA PLUS"}
                </Badge>
              </div>
              <div className="flex items-center gap-5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  {provider ? `via ${provider === 'paystack' ? 'Paystack' : provider === 'ivno' ? 'Ivno' : provider}` : 'No provider'}
                </span>
                {subscription?.currentPeriodEnd && (
                  <span className="flex items-center gap-1.5">
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
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-4 mb-10">
        <div className="lg:col-span-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Pick the right plan</h2>
              <p className="text-sm text-muted-foreground mt-1">Flexible pricing that grows with your team.</p>
            </div>
            <div className="flex items-center gap-3 p-1.5 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm self-start">
              <div className="flex items-center gap-1 px-2.5 border-r border-border/30">
                <button onClick={() => setCurrency("USD")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200",
                    currency === 'USD'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}>
                  USD
                </button>
                <button onClick={() => setCurrency("NGN")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200",
                    currency === 'NGN'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}>
                  NGN
                </button>
              </div>
              <div className="flex items-center gap-3 px-2.5">
                <span className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  billingInterval === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
                )}>Monthly</span>
                <Switch checked={billingInterval === "annual"} onCheckedChange={(checked) => setBillingInterval(checked ? "annual" : "monthly")} />
                <span className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  billingInterval === 'annual' ? 'text-foreground' : 'text-muted-foreground'
                )}>Annual</span>
                <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 rounded-md">
                  SAVE 20%
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
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
              const grouped = !isFree ? groupFeatures(plan.features) : [];

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-2xl border transition-all duration-250",
                    "bg-card/40 backdrop-blur-sm",
                    isCurrentPlan
                      ? "border-primary/40 shadow-md shadow-primary/5"
                      : isPopular
                        ? "border-primary/20 shadow-lg shadow-primary/5"
                        : "border-border/40 shadow-sm hover:shadow-md",
                    "hover:shadow-xl hover:-translate-y-0.5",
                    isPopular ? "lg:scale-[1.02]" : "",
                  )}
                  style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                      <div className="bg-primary text-primary-foreground text-[11px] font-semibold px-4 py-1 rounded-full shadow-lg shadow-primary/20 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        Most Popular
                      </div>
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge variant="default" className="text-[10px] font-semibold px-2 py-0.5 rounded-md">
                        Active
                      </Badge>
                    </div>
                  )}

                  <div className="p-6 pb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn(
                        "h-8 w-8 rounded-xl flex items-center justify-center",
                        isFree ? "bg-muted/50 text-muted-foreground" :
                        isPopular ? "bg-primary/10 text-primary" :
                        "bg-primary/5 text-primary/70"
                      )}>
                        <Zap className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold tracking-tight">{plan.name}</span>
                    </div>

                    {isFree ? (
                      <div className="mb-5">
                        <span className="text-3xl font-bold tracking-tight">{currency === "NGN" ? "₦0" : "$0"}</span>
                      </div>
                    ) : (
                      <div className="mb-5">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-3xl font-bold tracking-tight">{formattedPrice}</span>
                          <span className="text-sm text-muted-foreground ml-1">
                            /{billingInterval === 'annual' ? 'yr' : 'mo'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                          <span>Base: {currency === "USD" ? `$${plan.basePriceMonthlyUSD / 100}` : `₦${(plan.basePriceMonthlyUSD / 100 * 1250).toLocaleString()}`}</span>
                          <span>+ {currentMemberCount} {currentMemberCount === 1 ? 'member' : 'members'} × {currency === "USD" ? `$${plan.perUserPriceMonthlyUSD / 100}` : `₦${(plan.perUserPriceMonthlyUSD / 100 * 1250).toLocaleString()}`}</span>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground/70 leading-relaxed mb-4">{plan.description}</p>
                  </div>

                  {!isFree && (
                    <div className="px-6 pb-2">
                      <Separator className="bg-border/30" />
                    </div>
                  )}

                  {!isFree && (
                    <div className="px-6 pb-4 flex-1">
                      <div className="space-y-3">
                        {grouped.map((g) => (
                          <div key={g.key}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-primary/60">{g.icon}</span>
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">{g.label}</span>
                            </div>
                            <ul className="space-y-1">
                              {g.features.map((f, fi) => (
                                <li key={fi} className="flex items-start gap-2 text-xs">
                                  <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                                  <span className="text-muted-foreground/80 leading-relaxed">{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isFree && (
                    <div className="px-6 pb-4 flex-1">
                      <ul className="space-y-2">
                        {plan.features.map((f, fi) => (
                          <li key={fi} className="flex items-start gap-2 text-xs">
                            <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground/80 leading-relaxed">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="px-6 pb-6 pt-2">
                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full h-11 rounded-xl border border-border/30 bg-card/30 text-sm font-medium text-muted-foreground/60 cursor-default"
                      >
                        Current Plan
                      </button>
                    ) : isFree && isPaidPlan ? (
                      <button
                        onClick={() => executeCheckout(plan.id)}
                        disabled={isInitializingPayment === plan.id}
                        className="w-full h-11 rounded-xl border border-border/40 bg-card/20 text-sm font-medium text-muted-foreground hover:bg-card/40 hover:border-border/60 transition-all duration-200 disabled:opacity-50"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <ArrowDown className="h-4 w-4" />
                          {isInitializingPayment === plan.id ? "Starting..." : "Switch to Free"}
                        </span>
                      </button>
                    ) : (
                      <div>
                        {isUpgrade ? (
                          <button
                            onClick={() => handleCheckout(plan.id, formattedPrice, plan.name)}
                            disabled={isInitializingPayment === plan.id}
                            className={cn(
                              "group relative w-full h-11 rounded-xl text-sm font-semibold transition-all duration-200 overflow-hidden",
                              isPopular
                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                                : "border border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50"
                            )}
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              {isInitializingPayment === plan.id ? (
                                <span className="flex items-center gap-2">
                                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                  Starting...
                                </span>
                              ) : (
                                <>
                                  Upgrade
                                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                                </>
                              )}
                            </span>
                          </button>
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <CreditBalance />
          {subscription?.dunningLevel != null && subscription.dunningLevel > 0 && (
            <div className="p-5 rounded-2xl border border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-semibold text-red-500">Dunning Active</span>
              </div>
              <p className="text-xs text-red-400/80">
                Retry level {subscription.dunningLevel} of 3. Your subscription will be deactivated if payment fails again.
              </p>
            </div>
          )}
          {subscription?.cancelAtPeriodEnd && subscription?.currentPeriodEnd && (
            <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-500">Cancellation Scheduled</span>
              </div>
              <p className="text-xs text-amber-400/80 mb-3">
                Your subscription ends on {format(new Date(subscription.currentPeriodEnd), "MMM do, yyyy")}.
              </p>
              <button
                onClick={() => activeWorkspaceId && reactivateSubscription(activeWorkspaceId)}
                className="text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors"
              >
                Reactivate &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-16 space-y-8">
        {invoicesData && (
          <InvoiceList
            invoices={invoicesData.invoices || []}
            total={invoicesData.total || 0}
            isLoading={invoicesLoading}
          />
        )}

        <div className="p-6 rounded-2xl border border-border/40 bg-card/20">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-primary/60" />
            <h3 className="text-base font-semibold">Payment Methods</h3>
          </div>
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground/60">
            <span>Payment method management coming soon</span>
          </div>
        </div>
      </div>

      <div className="mt-16 p-8 sm:p-10 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent text-center">
        <Sparkles className="h-8 w-8 text-primary/40 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Enterprise Scaling Needs?</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto leading-relaxed">
          Custom solutions for large-scale operations with dedicated support, advanced security, and SLA guarantees.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button className="h-10 px-5 rounded-xl border border-border/40 text-sm font-medium hover:bg-card/40 transition-all duration-200">
            Contact Sales
          </button>
          <button className="h-10 px-5 rounded-xl text-sm font-medium text-primary hover:text-primary/80 transition-all duration-200 flex items-center gap-1">
            View Enterprise Roadmap
            <ChevronRight className="h-4 w-4" />
          </button>
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
