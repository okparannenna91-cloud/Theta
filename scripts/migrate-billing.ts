/**
 * Migration Script: Backfill subscriptionStatus from legacy billingStatus
 *
 * This script migrates existing workspaces from the old dual-field system
 * to the new unified subscriptionStatus field.
 *
 * Run: npx ts-node scripts/migrate-billing.ts
 */
import { prisma } from "../lib/prisma";

const STATUS_MAP: Record<string, string> = {
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
  deactivated: "deactivated",
  trialing: "trialing",
};

async function migrateBillingStatus() {
  console.log("Starting billing status migration...");

  const workspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      plan: true,
      billingStatus: true,
      subscriptionStatus: true,
      billingInterval: true,
      billingProvider: true,
      nextBillingDate: true,
      paystackAuthCode: true,
      paystackCustomerId: true,
      ivnoOrderId: true,
      trialEndsAt: true,
      trialStartedAt: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const ws of workspaces) {
    // If subscriptionStatus is already set and meaningful, skip
    if (ws.subscriptionStatus && ws.subscriptionStatus !== "trialing" && ws.subscriptionStatus !== "") {
      skipped++;
      continue;
    }

    // Map legacy billingStatus to subscriptionStatus
    const newStatus = STATUS_MAP[ws.billingStatus || "active"] || "trialing";

    await prisma.workspace.update({
      where: { id: ws.id },
      data: {
        subscriptionStatus: newStatus,
        // Copy over billing fields if they exist on legacy but not new fields
        ...(ws.billingInterval && !ws.billingInterval ? { billingInterval: ws.billingInterval } : {}),
        ...(ws.billingProvider && !ws.billingProvider ? { billingProvider: ws.billingProvider } : {}),
        ...(ws.nextBillingDate && !ws.currentPeriodEnd ? { currentPeriodEnd: ws.nextBillingDate } : {}),
      },
    });

    updated++;
    console.log(`  Migrated workspace ${ws.id}: billingStatus=${ws.billingStatus} → subscriptionStatus=${newStatus}`);
  }

  console.log(`\nMigration complete: ${updated} updated, ${skipped} skipped`);
}

migrateBillingStatus()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
