"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CancelSubscriptionDialogProps {
  onCancel: (immediate: boolean, reason?: string) => Promise<void>;
  isCancelling: boolean;
  hasActiveSubscription: boolean;
}

export function CancelSubscriptionDialog({
  onCancel,
  isCancelling,
  hasActiveSubscription,
}: CancelSubscriptionDialogProps) {
  const [open, setOpen] = useState(false);
  const [cancelType, setCancelType] = useState<"period_end" | "immediate">("period_end");
  const [reason, setReason] = useState("");

  if (!hasActiveSubscription) return null;

  const handleConfirm = async () => {
    await onCancel(cancelType === "immediate", reason || undefined);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
          Cancel Subscription
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            Your workspace will lose access to paid features after cancellation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setCancelType("period_end")}
              className={`w-full text-left flex items-start gap-3 border rounded-lg p-4 transition-colors ${cancelType === "period_end" ? "border-red-500 bg-red-50" : "border-border hover:bg-muted/50"}`}
            >
              <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${cancelType === "period_end" ? "border-red-500" : "border-muted-foreground"}`}>
                {cancelType === "period_end" && <div className="h-2 w-2 rounded-full bg-red-500" />}
              </div>
              <div>
                <p className="font-medium text-sm">Cancel at period end</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Keep access until the current billing period ends. Recommended.
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setCancelType("immediate")}
              className={`w-full text-left flex items-start gap-3 border rounded-lg p-4 transition-colors ${cancelType === "immediate" ? "border-red-500 bg-red-50" : "border-border hover:bg-muted/50"}`}
            >
              <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${cancelType === "immediate" ? "border-red-500" : "border-muted-foreground"}`}>
                {cancelType === "immediate" && <div className="h-2 w-2 rounded-full bg-red-500" />}
              </div>
              <div>
                <p className="font-medium text-sm">Cancel immediately</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Access is revoked right away. No refund for unused time.
                </p>
              </div>
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Help us improve by sharing why you're leaving..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isCancelling}
          >
            {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
