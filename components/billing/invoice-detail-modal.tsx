"use client";

import { format } from "date-fns";
import { FileText, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoiceDetail } from "@/hooks/use-invoices";

interface InvoiceDetailModalProps {
  invoiceId: string | null;
  onClose: () => void;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  void: "outline",
  refunded: "destructive",
};

export function InvoiceDetailModal({ invoiceId, onClose }: InvoiceDetailModalProps) {
  const { data: invoice, isLoading } = useInvoiceDetail(invoiceId);

  return (
    <Dialog open={!!invoiceId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl" onClose={onClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Invoice Details
          </DialogTitle>
          <DialogDescription>
            {invoice?.invoiceNumber || invoiceId?.slice(0, 8) || "Loading..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        ) : invoice ? (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Invoice Number</p>
                <p className="font-medium">{invoice.invoiceNumber || invoiceId?.slice(0, 8) || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Date</p>
                <p className="font-medium">{invoice.date ? format(new Date(invoice.date), "PPP") : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Status</p>
                <Badge variant={statusVariant[invoice.status] || "outline"} className="capitalize text-xs rounded-md">
                  {invoice.status || "unknown"}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Period</p>
                <p className="font-medium">
                  {invoice.periodStart ? format(new Date(invoice.periodStart), "MMM d") : "—"}
                  {" — "}
                  {invoice.periodEnd ? format(new Date(invoice.periodEnd), "MMM d, yyyy") : "—"}
                </p>
              </div>
            </div>

            {invoice.lineItems && invoice.lineItems.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Line Items</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="pb-2 font-medium">Description</th>
                      <th className="pb-2 font-medium text-right">Qty</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.map((item: any, i: number) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="py-2">{item.description || "Item"}</td>
                        <td className="py-2 text-right">{item.quantity || 1}</td>
                        <td className="py-2 text-right">
                          {invoice.currency || "USD"} {((item.amount || 0) / 100).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="pt-3">Total</td>
                      <td className="pt-3 text-right"></td>
                      <td className="pt-3 text-right">
                        {invoice.currency || "USD"} {((invoice.amount || 0) / 100).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {!invoice.lineItems && (
              <div className="flex items-center justify-between text-sm border-t pt-4">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">
                  {invoice.currency || "USD"} {((invoice.amount || 0) / 100).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Invoice not found
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
