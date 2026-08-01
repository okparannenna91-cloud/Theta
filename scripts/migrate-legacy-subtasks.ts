import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Migrates legacy `Subtask` rows (title + completed only) into full child Tasks
 * (Task.parentId hierarchy). Idempotent: parents that already have child tasks
 * are skipped, so this can be re-run safely.
 *
 * Run: npx tsx scripts/migrate-legacy-subtasks.ts
 */
async function main() {
  console.log("Migrating legacy subtasks → child tasks...");

  const legacySubtasks = await prisma.subtask.findMany({
    orderBy: [{ taskId: "asc" }, { order: "asc" }],
  });

  console.log(`Found ${legacySubtasks.length} legacy subtask(s).`);

  let created = 0;
  let skippedParents = 0;
  let deleted = 0;

  const parentsWithChildren = new Set(
    (
      await prisma.task.findMany({
        where: { parentId: { not: null } },
        select: { parentId: true },
      })
    ).map((t) => t.parentId as string)
  );

  for (const subtask of legacySubtasks) {
    const parent = await prisma.task.findUnique({
      where: { id: subtask.taskId },
      select: { workspaceId: true, projectId: true, userId: true },
    });

    if (!parent) {
      console.warn(`Skipping legacy subtask ${subtask.id}: parent task ${subtask.taskId} not found.`);
      continue;
    }

    if (parentsWithChildren.has(subtask.taskId)) {
      skippedParents += 1;
      console.warn(`Skipping legacy subtask ${subtask.id}: parent ${subtask.taskId} already has child tasks.`);
      continue;
    }

    await prisma.task.create({
      data: {
        title: subtask.title,
        status: subtask.completed ? "done" : "todo",
        progress: subtask.completed ? 100 : 0,
        completedAt: subtask.completed ? subtask.createdAt : null,
        order: subtask.order,
        parentId: subtask.taskId,
        workspaceId: parent.workspaceId,
        projectId: parent.projectId,
        userId: parent.userId,
        boardId: null,
        columnId: null,
      },
    });

    await prisma.subtask.delete({ where: { id: subtask.id } });
    parentsWithChildren.add(subtask.taskId);
    created += 1;
    deleted += 1;
  }

  // Recalc progress on all affected parents
  const affectedParentIds = [...new Set(legacySubtasks.map((s) => s.taskId))];
  for (const parentId of affectedParentIds) {
    const children = await prisma.task.findMany({
      where: { parentId },
      select: { progress: true, startDate: true, dueDate: true },
    });
    if (children.length === 0) continue;
    const avgProgress = Math.round(
      children.reduce((acc: number, child: any) => acc + (child.progress || 0), 0) / children.length
    );
    let minStart = children[0].startDate;
    let maxEnd = children[0].dueDate;
    for (const child of children) {
      if (child.startDate && (!minStart || child.startDate < minStart)) minStart = child.startDate;
      if (child.dueDate && (!maxEnd || child.dueDate > maxEnd)) maxEnd = child.dueDate;
    }
    await prisma.task.update({
      where: { id: parentId },
      data: { progress: avgProgress, startDate: minStart, dueDate: maxEnd, isSummary: true },
    });
  }

  console.log(
    `Done: created ${created} child task(s), deleted ${deleted} legacy row(s), skipped ${skippedParents} parent(s) with existing children.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
