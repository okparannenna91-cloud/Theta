import "./load-env";
import { PrismaClient } from "@prisma/client";
import {
  StatusCategory,
  inferStatusCategory,
} from "../lib/constants/status";

const prisma = new PrismaClient();

/**
 * Backfills the semantic `category` field (TODO / IN_PROGRESS / DONE / BLOCKED)
 * onto existing Status documents that predate the Status Category feature.
 *
 * MongoDB does NOT stamp `@default("TODO")` onto existing documents when the
 * field is added (no ALTER TABLE equivalent), so pre-existing statuses have no
 * `category` field at all. Without this backfill, semantic completion/activity
 * detection falls back to name-based keyword matching, which misses arbitrary
 * custom names (e.g. a column named "Shipped" would never count as done).
 *
 * Idempotent: only touches statuses whose category is missing/null, or that
 * still carry the auto-stamped "TODO" default while their name clearly maps
 * to a different category. Explicit non-TODO categories are never overwritten.
 *
 * Run: npx tsx scripts/backfill-status-categories.ts
 */
async function main() {
  const statuses = await prisma.status.findMany({
    select: { id: true, name: true, category: true },
  });

  console.log(`Found ${statuses.length} status(es).`);

  const toUpdate: { id: string; name: string; from: string | null; to: StatusCategory }[] = [];
  const leftAlone = new Set<string>();

  for (const s of statuses) {
    const inferred = inferStatusCategory(s.name);
    const current = s.category ? s.category.toUpperCase() : null;

    if (!inferred) {
      // Unknown name — respect whatever is there (or leave unset).
      if (current !== null && current !== "TODO") leftAlone.add(s.name);
      continue;
    }

    if (current === null || current === "TODO") {
      if (inferred !== "TODO") {
        toUpdate.push({ id: s.id, name: s.name, from: current, to: inferred });
      } else {
        // Missing/null + name is a TODO variant — set it explicitly so the
        // field exists and future code paths don't treat it as "no category".
        toUpdate.push({ id: s.id, name: s.name, from: current, to: inferred });
      }
    } else if (current !== inferred) {
      // Explicit category that contradicts the name — respect manual choice.
      leftAlone.add(s.name);
    }
  }

  console.log(`Updating ${toUpdate.length} status(es) to their inferred categories.`);
  for (const u of toUpdate) {
    await prisma.status.updateMany({
      where: { id: u.id },
      data: { category: u.to },
    });
    console.log(`  ${u.name}: ${u.from ?? "(unset)"} -> ${u.to}`);
  }

  if (leftAlone.size > 0) {
    console.log(`Left ${leftAlone.size} status(es) untouched (explicit category):`);
    for (const name of leftAlone) console.log(`  ${name}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
