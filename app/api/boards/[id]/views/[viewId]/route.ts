import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; viewId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const view = await prisma.boardView.findUnique({
      where: { id: params.viewId },
    });

    if (!view) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    if (view.boardId !== params.id) {
      return NextResponse.json({ error: "View does not belong to this board" }, { status: 400 });
    }

    await prisma.boardView.delete({ where: { id: params.viewId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting board view:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
