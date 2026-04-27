
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Updating all workspace members to active status...");
  
  // MongoDB doesn't automatically backfill default values for existing documents on schema change
  // We need to explicitly set status to "active" for any member that doesn't have a status or has a null status
  const result = await prisma.workspaceMember.updateMany({
    where: {
      OR: [
        { status: { isSet: false } },
        { status: null }
      ]
    },
    data: {
      status: "active"
    }
  });

  console.log(`Updated ${result.count} members.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
