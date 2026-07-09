const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const { PrismaClient } = require("@prisma/client");

const url = process.env.MONGODB_URI;
if (!url) {
  console.error("MONGODB_URI is not set. Check .env.local");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url } },
});

async function main() {
  console.log("Starting ProjectMember backfill...\n");

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      workspaceId: true,
      userId: true,
      visibility: true,
    },
  });

  console.log(`Found ${projects.length} projects to process.\n`);

  let created = 0;
  let skipped = 0;

  for (const project of projects) {
    const existingMembers = await prisma.projectMember.findMany({
      where: { projectId: project.id },
      select: { userId: true },
    });
    const existingUserIds = new Set(existingMembers.map((m) => m.userId));

    const toCreate = [];

    if (!existingUserIds.has(project.userId)) {
      toCreate.push({ projectId: project.id, userId: project.userId, role: "manager" });
    }

    const workspaceAdmins = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: project.workspaceId,
        role: { in: ["owner", "admin"] },
      },
      select: { userId: true },
    });

    for (const admin of workspaceAdmins) {
      if (!existingUserIds.has(admin.userId)) {
        toCreate.push({ projectId: project.id, userId: admin.userId, role: "manager" });
      }
    }

    if (project.visibility === "workspace_visible") {
      const allMembers = await prisma.workspaceMember.findMany({
        where: {
          workspaceId: project.workspaceId,
          status: "active",
        },
        select: { userId: true },
      });

      for (const member of allMembers) {
        if (!existingUserIds.has(member.userId) && !toCreate.some((t) => t.userId === member.userId)) {
          toCreate.push({ projectId: project.id, userId: member.userId, role: "viewer" });
        }
      }
    }

    if (toCreate.length > 0) {
      await prisma.projectMember.createMany({ data: toCreate });
      created += toCreate.length;
      console.log(`  ${project.name}: added ${toCreate.length} member(s)`);
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. Created ${created} ProjectMember records. ${skipped} projects already up-to-date.`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
