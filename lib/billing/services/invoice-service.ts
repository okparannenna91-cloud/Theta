import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { logger } from "@/lib/logger";

export class InvoiceService {
  async generateNumber(year?: number): Promise<string> {
    const y = year ?? new Date().getFullYear();
    const lastInvoice = await prisma.invoice.findFirst({
      where: { number: { startsWith: `INV-${y}-` } },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    if (!lastInvoice) return `INV-${y}-000001`;
    const lastSeq = parseInt(lastInvoice.number.split("-").pop() || "0", 10);
    return `INV-${y}-${String(lastSeq + 1).padStart(6, "0")}`;
  }

  async createSubscriptionInvoice(
    workspaceId: string,
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date,
    amount: number,
    currency: string,
    lineItems: { label: string; type: string; quantity: number; unitPrice: number; amount: number }[]
  ) {
    const calculatedTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    if (calculatedTotal !== amount) {
      throw new Error(
        `Line item total (${calculatedTotal}) does not match invoice amount (${amount})`
      );
    }

    const number = await this.generateNumber();

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          workspaceId,
          subscriptionId,
          number,
          subtotal: amount,
          total: amount,
          currency,
          status: "pending",
          periodStart,
          periodEnd,
          dueAt: addDays(new Date(), 30),
          items: {
            create: lineItems.map((item) => ({
              type: item.type,
              label: item.label,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
            })),
          },
        },
        include: { items: true },
      });
      return created;
    });

    return invoice;
  }

  async createProrationInvoice(
    workspaceId: string,
    subscriptionId: string,
    oldPlan: string,
    newPlan: string,
    chargeAmount: number,
    creditAmount: number,
    currency: string,
    prorationStart: Date,
    prorationEnd: Date
  ) {
    if (chargeAmount > 0 && creditAmount > 0) {
      throw new Error("Cannot have both charge and credit in a proration invoice");
    }

    if (chargeAmount > 0) {
      const number = await this.generateNumber();
      const invoice = await prisma.$transaction(async (tx) => {
        const created = await tx.invoice.create({
          data: {
            workspaceId,
            subscriptionId,
            number,
            subtotal: chargeAmount,
            total: chargeAmount,
            currency,
            status: "pending",
            periodStart: prorationStart,
            periodEnd: prorationEnd,
            items: {
              create: {
                type: "proration",
                label: `Prorated upgrade from ${oldPlan} to ${newPlan}`,
                quantity: 1,
                unitPrice: chargeAmount,
                amount: chargeAmount,
                prorationPeriodStart: prorationStart,
                prorationPeriodEnd: prorationEnd,
              },
            },
          },
          include: { items: true },
        });
        return created;
      });
      return invoice;
    }

    if (creditAmount > 0) {
      const number = await this.generateNumber();
      const invoice = await prisma.$transaction(async (tx) => {
        const created = await tx.invoice.create({
          data: {
            workspaceId,
            subscriptionId,
            number,
            subtotal: -creditAmount,
            total: -creditAmount,
            currency,
            status: "pending",
            periodStart: prorationStart,
            periodEnd: prorationEnd,
            items: {
              create: {
                type: "credit",
                label: `Prorated credit for downgrade from ${oldPlan} to ${newPlan}`,
                quantity: 1,
                unitPrice: -creditAmount,
                amount: -creditAmount,
                prorationPeriodStart: prorationStart,
                prorationPeriodEnd: prorationEnd,
              },
            },
          },
          include: { items: true },
        });
        return created;
      });
      return invoice;
    }

    return null;
  }

  async markPaid(invoiceId: string, chargeId: string, paidAt: Date = new Date()) {
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "paid",
        paidAt,
        providerChargeId: chargeId,
      },
    });
  }

  async void(invoiceId: string, reason: string) {
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "void",
        voidedAt: new Date(),
        memo: reason,
      },
    });
  }

  async createCreditNote(originalInvoiceId: string, amount: number, reason: string) {
    const original = await prisma.invoice.findUnique({
      where: { id: originalInvoiceId },
    });
    if (!original) {
      throw new Error(`Original invoice ${originalInvoiceId} not found`);
    }

    const number = await this.generateNumber();
    const creditNote = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          workspaceId: original.workspaceId,
          subscriptionId: original.subscriptionId,
          number,
          subtotal: -amount,
          total: -amount,
          currency: original.currency,
          status: "credit_note",
          memo: reason,
          items: {
            create: {
              type: "credit",
              label: reason,
              quantity: 1,
              unitPrice: -amount,
              amount: -amount,
            },
          },
        },
        include: { items: true },
      });
      return created;
    });

    return creditNote;
  }

  async listForWorkspace(workspaceId: string, limit: number = 20, offset: number = 0) {
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { workspaceId },
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoice.count({
        where: { workspaceId },
      }),
    ]);
    return { invoices, total };
  }

  async getDetail(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });
    return invoice;
  }
}

export const invoiceService = new InvoiceService();
