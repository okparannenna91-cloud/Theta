import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isSuperAdmin(user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const workspaceCount = await prisma.workspace.count();
    const userCount = await prisma.user.count();
    const taskCount = await prisma.task.count();

    return NextResponse.json({
      admin: true,
      userId: user.id,
      stats: { workspaces: workspaceCount, users: userCount, tasks: taskCount },
      env: {
        nodeEnv: process.env.NODE_ENV,
        testingMode: !!process.env.TESTING_MODE,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
