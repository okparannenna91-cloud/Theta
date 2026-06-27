"use client";

import { useState } from "react";
import { ArrowRight, ArrowDown, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type PlanInfo = {
  planKey: string;
  name: string;
  price: number;
  formattedPrice: string;
  isUpgrade: boolean;
};

interface ChangePlanDialogProps {
  currentPlan: string;
  targetPlan: PlanInfo;
  onConfirm: () => Promise<void>;
  isChanging: boolean;
}

export function ChangePlanDialog({
  currentPlan,
  targetPlan,
  onConfirm,
  isChanging,
}: ChangePlanDialogProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    await onConfirm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={targetPlan.isUpgrade ? "default" : "secondary"}
          size="sm"
          className={targetPlan.isUpgrade ? "" : "border-dashed"}
        >
          {targetPlan.isUpgrade ? (
            <>
              <ArrowRight className="h-3.5 w-3.5 mr-1" />
              Upgrade
            </>
          ) : (
            <>
              <ArrowDown className="h-3.5 w-3.5 mr-1" />
              Downgrade
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {targetPlan.isUpgrade ? (
              <ArrowRight className="h-5 w-5 text-emerald-500" />
            ) : (
              <ArrowDown className="h-5 w-5 text-amber-500" />
            )}
            {targetPlan.isUpgrade ? "Upgrade" : "Downgrade"} to {targetPlan.name}
          </DialogTitle>
          <DialogDescription>
            {targetPlan.isUpgrade
              ? "You'll be charged a prorated amount for the remainder of this billing period."
              : "The change will take effect at the end of the current billing period."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current plan</span>
              <span className="font-medium capitalize">{currentPlan}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">New plan</span>
              <span className="font-medium">{targetPlan.name}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price difference</span>
              <span className={`font-medium ${targetPlan.isUpgrade ? "text-red-500" : "text-emerald-500"}`}>
                {targetPlan.formattedPrice}/{targetPlan.isUpgrade ? "mo (prorated)" : "mo"}
              </span>
            </div>
          </div>

          {targetPlan.isUpgrade ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
              <Check className="h-4 w-4 inline mr-1" />
              You'll get immediate access to all {targetPlan.name} features.
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <ArrowDown className="h-4 w-4 inline mr-1" />
              You'll keep your current features until the billing period ends.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={targetPlan.isUpgrade ? "default" : "secondary"}
            onClick={handleConfirm}
            disabled={isChanging}
          >
            {isChanging
              ? "Processing..."
              : targetPlan.isUpgrade
                ? "Confirm Upgrade"
                : "Confirm Downgrade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
