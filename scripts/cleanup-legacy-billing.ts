/**
 * Cleanup Script: Remove legacy billing fields from schema
 *
 * After migration is confirmed complete, run this to:
 * 1. Verify all workspaces have subscriptionStatus set
 * 2. Output the Prisma schema changes needed to remove legacy fields
 *
 * Run: npx ts-node scripts/cleanup-legacy-billing.ts
 */
import { prisma } from "../lib/prisma";

async function verifyMigration() {
  console.log("Verifying billing migration...\n");

  const total = await prisma.workspace.count();
  const withSubscriptionStatus = await prisma.workspace.count({
    where: { subscriptionStatus: { not: "" } },
  });
  const stillOnLegacy = await prisma.workspace.count({
    where: { subscriptionStatus: "" },
  });
  const withBillingStatus = await prisma.workspace.count({
    where: { billingStatus: { not: "" } },
  });

  console.log(`Total workspaces: ${total}`);
  console.log(`With subscriptionStatus: ${withSubscriptionStatus}`);
  console.log(`Still on legacy only: ${stillOnLegacy}`);
  console.log(`With billingStatus: ${withBillingStatus}\n`);

  // Check for any mismatches
  const mismatches = await prisma.workspace.findMany({
    where: {
      subscriptionStatus: { not: "" },
      billingStatus: { not: "" },
    },
    select: { id: true, subscriptionStatus: true, billingStatus: true },
    take: 10,
  });

  if (mismatches.length > 0) {
    console.log("WARNING: Found mismatches between subscriptionStatus and billingStatus:");
    mismatches.forEach((m) => console.log(`  ${m.id}: subStatus=${m.subscriptionStatus}, billStatus=${m.billingStatus}`));
  } else {
    console.log("All workspaces have consistent status fields. ✓\n");
  }

  console.log("=== Steps to complete cleanup ===");
  console.log("1. Remove `billingStatus` field from Workspace model in schema.prisma");
  console.log("2. Remove `nextBillingDate` from Workspace model (use currentPeriodEnd)");
  console.log("   - Instead of: nextBillingDate");
  console.log("   - Use:        currentPeriodEnd");
  console.log("3. Remove `paystackAuthCode` from schema (use providerMetadata)");
  console.log("4. Remove `subscriptionId` from schema (use Subscription relation)");
  console.log("5. Delete `lib/paystack-billing.ts`");
  console.log("6. Delete `lib/ivno-billing.ts`");
  console.log("7. Update references:");
  console.log("   - lib/paystack.ts → fully replaced by PaystackProvider");
  console.log("   - lib/ivno.ts → fully replaced by IvnoProvider");
  console.log("   - lib/currency.ts → still used for exchange rates");
}

verifyMigration()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
