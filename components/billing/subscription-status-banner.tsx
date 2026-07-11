"use client";

import { AlertCircle, Clock, ShieldAlert, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

interface SubscriptionStatusBannerProps {
  status: string;
  trialDaysRemaining?: number;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
  onRetry?: () => void;
  onReactivate?: () => void;
  isLoading?: boolean;
}

export function SubscriptionStatusBanner({
  status,
  trialDaysRemaining = 0,
  cancelAtPeriodEnd = false,
  currentPeriodEnd,
  onRetry,
  onReactivate,
  isLoading,
}: SubscriptionStatusBannerProps) {
  if (status === "trialing" && trialDaysRemaining > 0) {
    return (
      <Card className="mb-6 p-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Trial ends in {trialDaysRemaining} {trialDaysRemaining === 1 ? "day" : "days"}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Choose a plan to continue using all features.
              </p>
            </div>
          </div>
          <Link href="/billing">
            <Button variant="default" size="sm" className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
              View Plans
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (status === "trialing" && trialDaysRemaining <= 0) {
    return (
      <Card className="mb-6 p-4 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Trial expired
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Your free trial has ended. Select a plan to continue.
              </p>
            </div>
          </div>
          <Link href="/billing">
            <Button variant="default" size="sm" className="shrink-0 bg-red-600 hover:bg-red-700 text-white">
              Choose a Plan
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (status === "past_due") {
    return (
      <Card className="mb-6 p-4 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Payment past due
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Please retry payment to keep your subscription active.
              </p>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            className="shrink-0 bg-red-600 hover:bg-red-700 text-white"
            onClick={onRetry}
            disabled={isLoading}
          >
            {isLoading ? "Retrying..." : "Retry Payment"}
          </Button>
        </div>
      </Card>
    );
  }

  if (status === "canceled" && cancelAtPeriodEnd && currentPeriodEnd) {
    return (
      <Card className="mb-6 p-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Subscription will end on {new Date(currentPeriodEnd).toLocaleDateString()}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                Reactivate to keep your workspace active.
              </p>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            className="shrink-0 bg-yellow-600 hover:bg-yellow-700 text-white"
            onClick={onReactivate}
            disabled={isLoading}
          >
            {isLoading ? "Reactivating..." : "Reactivate"}
          </Button>
        </div>
      </Card>
    );
  }

  if (status === "deactivated") {
    return (
      <Card className="mb-6 p-4 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Workspace deactivated
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Renew your subscription to restore access.
              </p>
            </div>
          </div>
          <Link href="/billing">
            <Button variant="default" size="sm" className="shrink-0 bg-red-600 hover:bg-red-700 text-white">
              Renew Subscription
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return null;
}
