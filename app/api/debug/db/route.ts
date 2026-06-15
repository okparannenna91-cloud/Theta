import { NextResponse } from "next/server";
import { prismaShard1, prismaShard2, prismaShard3 } from "@/lib/prisma";

export async function GET() {
    const results: any = {};
    const shards = [
        { name: "Shard 1", client: prismaShard1 },
        { name: "Shard 2", client: prismaShard2 },
        { name: "Shard 3", client: prismaShard3 },
    ];

    for (const shard of shards) {
        try {
            if (!shard.client) {
                results[shard.name] = "Not Initialized";
                continue;
            }
            const count = await (shard.client as any).chatMessage.count();
            const latest = await (shard.client as any).chatMessage.findMany({
                take: 5,
                orderBy: { createdAt: "desc" },
                select: { id: true, content: true, teamId: true, workspaceId: true, createdAt: true }
            });
            results[shard.name] = { count, latest };
        } catch (e: any) {
            results[shard.name] = `Error: ${e.message}`;
        }
    }

    return NextResponse.json(results);
}
