import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { GitHubService } from "@/lib/services/githubService";
import { BitbucketService } from "@/lib/services/bitbucketService";
import { AsanaService } from "@/lib/services/asanaService";
import { TrelloService } from "@/lib/services/trelloService";
import { WooCommerceService } from "@/lib/services/woocommerceService";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { provider, workspaceId } = await req.json();

        if (!provider || !workspaceId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        let result: any = null;

        switch (provider) {
            case "github":
                const github = new GitHubService(workspaceId);
                result = await github.getRepositories();
                break;
            case "bitbucket":
                const bitbucket = new BitbucketService(workspaceId);
                result = await bitbucket.getRepositories();
                break;
            case "asana":
                const asana = new AsanaService(workspaceId);
                result = await asana.getProjects();
                break;
            case "trello":
                const trello = new TrelloService(workspaceId);
                result = await trello.getBoards();
                break;
            case "woocommerce":
                const woo = new WooCommerceService(workspaceId);
                const products = await woo.getProducts();
                result = { count: products.length };
                break;
            default:
                throw new Error("Provider not supported for sync");
        }

        // After fetching, we should update the updatedAt timestamp in the DB
        const { getPrismaClient } = await import("@/lib/prisma");
        const prisma = getPrismaClient(workspaceId);
        await prisma.integration.updateMany({
            // @ts-ignore
            where: { workspaceId, provider },
            data: { updatedAt: new Date() }
        });

        return NextResponse.json({ success: true, count: Array.isArray(result) ? result.length : result.count });
    } catch (error: any) {
        console.error("Sync error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
