"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "./use-workspace";
import { toast } from "sonner";

interface SubscriptionInfo {
  status: "trialing" | "active" | "past_due" | "canceled" | "deactivated";
  plan: string;
  interval: string | null;
  provider: string | null;
  currency: string | null;
  trialEndsAt: string | null;
  trialDaysRemaining: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  dunningLevel: number | null;
}

export function useSubscription() {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<SubscriptionInfo>({
    queryKey: ["subscription", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/billing/subscription?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch subscription");
      const json = await res.json();
      const ws = json.workspace || {};
      return {
        status: ws.subscriptionStatus || json.status || "active",
        plan: ws.plan || "free",
        interval: ws.billingInterval || null,
        provider: ws.billingProvider || null,
        currency: ws.currency || "USD",
        trialEndsAt: ws.trialEndsAt || null,
        trialDaysRemaining: ws.trialDaysRemaining ?? 0,
        currentPeriodEnd: ws.currentPeriodEnd || null,
        cancelAtPeriodEnd: ws.cancelAtPeriodEnd || false,
        canceledAt: ws.canceledAt || null,
        dunningLevel: ws.dunningLevel ?? null,
      };
    },
    enabled: !!activeWorkspaceId,
    refetchInterval: 120000, // 2 min – subscription state changes infrequently
  });

  const cancelMutation = useMutation({
    mutationFn: async (params: { workspaceId: string; immediate?: boolean; reason?: string }) => {
      const res = await fetch("/api/billing/subscription/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) });
      if (!res.ok) throw new Error("Failed to cancel subscription");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["subscription", activeWorkspaceId] }); toast.success("Subscription canceled"); },
    onError: (err: Error) => { toast.error(err.message); },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (workspaceId: string) => {
      const res = await fetch("/api/billing/subscription/reactivate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId }) });
      if (!res.ok) throw new Error("Failed to reactivate");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["subscription", activeWorkspaceId] }); toast.success("Subscription reactivated"); },
    onError: (err: Error) => { toast.error(err.message); },
  });

  const retryMutation = useMutation({
    mutationFn: async (workspaceId: string) => {
      const res = await fetch("/api/billing/subscription/retry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId }) });
      if (!res.ok) throw new Error("Failed to retry payment");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["subscription", activeWorkspaceId] }); toast.success("Payment retry initiated"); },
    onError: (err: Error) => { toast.error(err.message); },
  });

  return {
    subscription: data,
    isLoading,
    error,
    refetch,
    cancelSubscription: cancelMutation.mutateAsync,
    reactivateSubscription: reactivateMutation.mutateAsync,
    retryPayment: retryMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
    isReactivating: reactivateMutation.isPending,
    isRetrying: retryMutation.isPending,
  };
}
