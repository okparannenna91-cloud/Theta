import "./load-env";
import { prisma } from "@/lib/prisma";
import { CONTAINER_TYPES, CATALOG_TYPES, migrateLegacyContainerTasks } from "@/lib/services/sync";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const workspaceId = args.find((a) => !a.startsWith("-"));

  console.log("Checking for legacy container/catalog tasks...");

  const candidates = await prisma.task.findMany({
    where: workspaceId ? { workspaceId } : undefined,
    select: { customFieldMetadata: true },
  });

  const counts: Record<string, number> = {};
  let total = 0;
  for (const t of candidates) {
    const type = (t.customFieldMetadata as any)?.type;
    if (!CONTAINER_TYPES.includes(type) && !CATALOG_TYPES.includes(type)) continue;
    counts[type] = (counts[type] ?? 0) + 1;
    total++;
  }

  console.log("Legacy container/catalog tasks found:", total);
  console.table(counts);

  if (total === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  if (dryRun) {
    const details = await prisma.task.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      select: { id: true, title: true, workspaceId: true, projectId: true, customFieldMetadata: true },
    });
    for (const t of details) {
      const meta = t.customFieldMetadata as any;
      if (!CONTAINER_TYPES.includes(meta?.type) && !CATALOG_TYPES.includes(meta?.type)) continue;
      const synced = await prisma.syncedItem.findFirst({
        where: { workspaceId: t.workspaceId, provider: meta.provider, externalId: meta.externalId, type: meta.type },
        select: { id: true, title: true, extra: true },
      });
      const match = await prisma.project.findFirst({
        where: { workspaceId: t.workspaceId, name: { equals: synced?.title ?? t.title, mode: "insensitive" } },
        select: { id: true, name: true },
      });
      console.log(JSON.stringify(
        { task: { id: t.id, title: t.title, workspaceId: t.workspaceId, projectId: t.projectId }, meta, synced, match },
        null, 2,
      ));
    }
    console.log("Dry run — no changes made.");
    return;
  }

  console.log("Running migration...");
  const stats = await migrateLegacyContainerTasks(workspaceId);
  console.log("Migration complete:");
  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
