/**
 * Dedup ProjectMember records.
 *
 * The `@@unique([projectId, userId])` constraint was added to the schema
 * after records already existed in the DB. If the same user was added to
 * the same project twice, this script removes the duplicate.
 *
 * Usage: node scripts/dedup-project-members.cjs
 * (must be run after `prisma generate` and MONGODB_URI must be set)
 */
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const { PrismaClient } = require("@prisma/client");

const url = process.env.MONGODB_URI;
if (!url) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url } },
});

async function main() {
  // Find all records grouped by projectId + userId
  const rows = await prisma.projectMember.findMany({
    select: { id: true, projectId: true, userId: true },
    orderBy: { id: "asc" },
  });

  const seen = new Map();
  const toDelete = [];

  for (const row of rows) {
    const key = `${row.projectId}:${row.userId}`;
    if (seen.has(key)) {
      toDelete.push(row.id);
    } else {
      seen.set(key, true);
    }
  }

  if (toDelete.length === 0) {
    console.log("No duplicate ProjectMember records found.");
    return;
  }

  console.log(`Found ${toDelete.length} duplicate(s). Removing...`);
  await prisma.projectMember.deleteMany({ where: { id: { in: toDelete } } });
  console.log(`Removed ${toDelete.length} duplicate record(s).`);

  // Verify index can be created
  console.log("Dedup complete. The unique index can now be created by running: npx prisma db push");
}

main()
  .catch((e) => {
    console.error("Dedup failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
