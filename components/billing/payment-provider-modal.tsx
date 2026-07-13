"use client";

import { useState } from "react";
import { CreditCard, Wallet, ExternalLink, Loader2, Bitcoin, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type PaymentProviderOption = {
  id: string;
  label: string;
  description: string;
  currencies: string[];
  recommended?: boolean;
  icon: "card" | "crypto";
  features: string[];
  cta: string;
};

export const PAYMENT_PROVIDERS: PaymentProviderOption[] = [
  {
    id: "flutterwave",
    label: "Pay with USD",
    description: "Credit Card, Debit Card, USD Payment",
    currencies: ["USD"],
    recommended: true,
    icon: "card",
    features: ["Credit & Debit Cards", "Fast checkout", "USD settlement"],
    cta: "Continue with Flutterwave",
  },
  {
    id: "ivno",
    label: "Pay with Crypto",
    description: "Bitcoin, Ethereum, USDT & more",
    currencies: ["USD"],
    recommended: false,
    icon: "crypto",
    features: ["Bitcoin (BTC)", "Ethereum (ETH)", "USDT & stablecoins", "No chargebacks"],
    cta: "Continue with Ivno.io",
  },
];

export type PriceBreakdown = {
  basePrice: number;
  perUserPrice: number;
  memberCount: number;
  userCharge: number;
  totalAmount: number;
  currency: string;
  interval: string;
};

interface PaymentProviderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  planPrice: string;
  breakdown: PriceBreakdown | null;
  onSelectProvider: (providerId: string) => Promise<void>;
}

export function PaymentProviderModal({
  open,
  onOpenChange,
  planName,
  planPrice,
  breakdown,
  onSelectProvider,
}: PaymentProviderModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (providerId: string) => {
    setLoading(providerId);
    try {
      await onSelectProvider(providerId);
    } finally {
      setLoading(null);
    }
  };

  const fmt = (cents: number) => {
    const c = breakdown?.currency === "NGN" ? "NGN" : "USD";
    const symbol = c === "USD" ? "$" : "₦";
    return `${symbol}${(cents / 100).toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b">
          <DialogHeader className="p-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="rounded-md text-xs font-medium">
                {planName}
              </Badge>
              <span className="text-sm text-muted-foreground font-medium">{planPrice}</span>
            </div>
            <DialogTitle className="text-xl">Choose your payment method</DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Select how you&apos;d like to pay for your subscription.
            </DialogDescription>
          </DialogHeader>

          {breakdown && (
            <div className="mt-4 bg-muted/50 rounded-lg p-4 text-sm space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Base workspace fee</span>
                <span>{fmt(breakdown.basePrice)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Users ({breakdown.memberCount} &times; {fmt(breakdown.perUserPrice)})</span>
                <span>{fmt(breakdown.userCharge)}</span>
              </div>
              <div className="border-t pt-1.5 mt-1.5 flex justify-between font-semibold">
                <span>Total</span>
                <span>{fmt(breakdown.totalAmount)}/{breakdown.interval === "annual" ? "yr" : "mo"}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          {PAYMENT_PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p.id)}
              disabled={loading !== null}
              className={`w-full text-left flex items-start gap-4 border-2 rounded-xl p-5 transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed ${
                p.recommended
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className={`shrink-0 h-12 w-12 rounded-xl flex items-center justify-center ${
                p.icon === "card"
                  ? "bg-primary/10 text-primary"
                  : "bg-amber-50 text-amber-600 border border-amber-200"
              }`}>
                {p.icon === "card" ? (
                  <CreditCard className="h-6 w-6" />
                ) : (
                  <Bitcoin className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{p.label}</span>
                  {p.recommended && (
                    <Badge className="rounded-md text-[10px] px-1.5 py-0 h-5 bg-primary text-primary-foreground font-medium">
                      Recommended
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">{p.description}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {p.features.map((f) => (
                    <span key={f} className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40 inline-block" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 self-center">
                {loading === p.id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <ExternalLink className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Secured by {PAYMENT_PROVIDERS.map((p) => p.id === "flutterwave" ? "Flutterwave" : "Ivno.io").join(" & ")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
