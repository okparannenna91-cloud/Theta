import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createViewSchema = z.object({
  name: z.string().min(1),
  filterConfig: z.any().optional(),
  sortConfig: z.any().optional(),
  columnVisibility: z.any().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const board = await prisma.board.findUnique({ where: { id: params.id } });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const views = await prisma.boardView.findMany({
      where: { boardId: params.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(views);
  } catch (error) {
    console.error("Error listing board views:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const board = await prisma.board.findUnique({ where: { id: params.id } });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = createViewSchema.parse(body);

    const view = await prisma.boardView.create({
      data: {
        boardId: params.id,
        name: data.name,
        filterConfig: data.filterConfig ?? {},
        sortConfig: data.sortConfig ?? null,
        columnVisibility: data.columnVisibility ?? {},
        userId: user.id,
      },
    });

    return NextResponse.json(view, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating board view:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
