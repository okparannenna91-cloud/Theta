"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Eye, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceDetailModal } from "./invoice-detail-modal";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  void: "outline",
  refunded: "destructive",
};

interface InvoiceListProps {
  invoices: any[];
  total: number;
  isLoading: boolean;
}

export function InvoiceList({ invoices, total, isLoading }: InvoiceListProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const limit = 20;

  if (isLoading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
            <FileText className="h-10 w-10 mb-3 text-muted-foreground/50" />
            <p>No invoices yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Invoice History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-medium">Invoice #</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice: any) => (
                  <tr key={invoice.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{invoice.invoiceNumber || invoice.id?.slice(0, 8) || "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {invoice.date ? format(new Date(invoice.date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {invoice.currency || "USD"} {((invoice.amount || 0) / 100).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant[invoice.status] || "outline"} className="capitalize text-xs rounded-md">
                        {invoice.status || "unknown"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedInvoiceId(invoice.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > limit && (
            <div className="px-6 py-3 border-t text-xs text-muted-foreground text-center">
              Showing {invoices.length} of {total} invoices
            </div>
          )}
        </CardContent>
      </Card>
      {selectedInvoiceId && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </>
  );
}
