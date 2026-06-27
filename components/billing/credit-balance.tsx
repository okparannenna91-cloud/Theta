"use client";

import { useQuery } from "@tanstack/react-query";
import { Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/use-workspace";

export function CreditBalance() {
  const { activeWorkspaceId } = useWorkspace();

  const { data, isLoading } = useQuery({
    queryKey: ["credit-balance", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/billing/credit-balance?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) return { balance: 0, currency: "USD" };
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  if (isLoading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Coins className="h-4 w-4" /> Credit Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  const balance = data?.balance ?? 0;
  const currency = data?.currency ?? "USD";

  if (balance <= 0) return null;

  const formattedBalance = currency === "USD"
    ? `$${(balance / 100).toFixed(2)}`
    : `₦${(balance / 100).toFixed(2)}`;

  return (
    <Card className="border shadow-sm border-emerald-200 bg-emerald-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700">
          <Coins className="h-4 w-4" /> Credit Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-emerald-600">{formattedBalance}</p>
        <p className="text-xs text-emerald-600/70 mt-1">
          Credits apply to future invoices automatically.
        </p>
      </CardContent>
    </Card>
  );
}
