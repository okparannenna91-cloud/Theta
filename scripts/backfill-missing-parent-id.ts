import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Backfills `parentId: null` onto Task documents that predate the subtask
 * hierarchy feature (they have no `parentId` field at all).
 *
 * Prisma's MongoDB connector generates `{ $eq: ["$parentId", null], $ne: ["$parentId", "$$REMOVE"] }`
 * for `parentId: { equals: null }` filters, which does NOT match documents where
 * the field is missing. Backfilling an explicit `null` makes every top-level
 * task query (Kanban board, Tasks list, My Tasks) match these documents again.
 *
 * Idempotent: only touches documents missing the field.
 *
 * Run: npx tsx scripts/backfill-missing-parent-id.ts
 */
async function main() {
  const missing = await prisma.$runCommandRaw({
    count: "Task",
    query: { parentId: { $exists: false } },
  });
  const missingCount = (missing as any).n ?? 0;

  if (missingCount === 0) {
    console.log("No Task documents missing `parentId` — nothing to do.");
    return;
  }

  console.log(`Backfilling parentId: null on ${missingCount} Task document(s)...`);

  const result = await prisma.$runCommandRaw({
    update: "Task",
    updates: [
      {
        q: { parentId: { $exists: false } },
        u: { $set: { parentId: null } },
        multi: true,
      },
    ],
  });

  const modified = (result as any).nModified ?? (result as any).n ?? 0;
  console.log(`Done. ${modified} document(s) updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
