"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "./use-workspace";

export function useInvoices(limit = 20, offset = 0) {
  const { activeWorkspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["invoices", activeWorkspaceId, limit, offset],
    queryFn: async () => {
      const res = await fetch(`/api/billing/invoices?workspaceId=${activeWorkspaceId}&limit=${limit}&offset=${offset}`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });
}

export function useInvoiceDetail(invoiceId: string | null) {
  return useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const res = await fetch(`/api/billing/invoices/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to fetch invoice");
      return res.json();
    },
    enabled: !!invoiceId,
  });
}
