import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { GitHubIntegration } from "@/lib/integrations/github";
import { BitbucketService } from "@/lib/services/bitbucketService";
import { AsanaService } from "@/lib/services/asanaService";
import { TrelloService } from "@/lib/services/trelloService";
import { WooCommerceService } from "@/lib/services/woocommerceService";
import { GoogleCalendarService } from "@/lib/services/google/calendarService";
import {
  persistSyncedItems,
  syncGithubTasks,
  importGoogleEventToCalendar,
  normalizeGithubRepo,
  normalizeGithubIssue,
  normalizeBitbucketRepo,
  normalizeAsanaProject,
  normalizeTrelloBoard,
  normalizeWooProduct,
  normalizeGoogleEvent,
} from "@/lib/services/sync";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const queryProvider = searchParams.get("provider");
        const queryWorkspaceId = searchParams.get("workspaceId");

        let body: any = {};
        try {
            body = await req.json();
        } catch {
            body = {};
        }

        const provider = queryProvider || body.provider;
        const workspaceId = queryWorkspaceId || body.workspaceId;

        if (!provider || !workspaceId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const integration = await prisma.integration.findFirst({
            where: { workspaceId, provider },
        });
        if (!integration) {
            return NextResponse.json({ error: "Integration is not connected" }, { status: 404 });
        }

        let count = 0;
        let created = 0;
        let updated = 0;

        switch (provider) {
            case "github": {
                const github = new GitHubIntegration(workspaceId);
                const repos = await github.listRepositories(workspaceId);
                const issues = await github.listIssues("all");
                count += await persistSyncedItems(workspaceId, integration.id, "github", [
                    ...repos.map(normalizeGithubRepo),
                    ...issues.map(normalizeGithubIssue),
                ]);
                const result = await syncGithubTasks(workspaceId, user.id);
                created = result.created;
                updated = result.updated;
                break;
            }
            case "bitbucket": {
                const bitbucket = new BitbucketService(workspaceId);
                const data = await bitbucket.getRepositories();
                const repos = Array.isArray(data) ? data : data.values ?? [];
                count += await persistSyncedItems(workspaceId, integration.id, "bitbucket", repos.map(normalizeBitbucketRepo));
                break;
            }
            case "asana": {
                const asana = new AsanaService(workspaceId);
                const projects = await asana.getProjects();
                count += await persistSyncedItems(workspaceId, integration.id, "asana", projects.map(normalizeAsanaProject));
                break;
            }
            case "trello": {
                const trello = new TrelloService(workspaceId);
                const boards = await trello.getBoards();
                count += await persistSyncedItems(workspaceId, integration.id, "trello", boards.map(normalizeTrelloBoard));
                break;
            }
            case "woocommerce": {
                const woo = new WooCommerceService(workspaceId);
                const products = await woo.getProducts();
                count += await persistSyncedItems(workspaceId, integration.id, "woocommerce", products.map(normalizeWooProduct));
                break;
            }
            case "google": {
                const google = new GoogleCalendarService(workspaceId);
                const data = await google.listEvents();
                const events = (data?.items ?? []) as any[];
                const normalized = events.map(normalizeGoogleEvent);
                count += await persistSyncedItems(workspaceId, integration.id, "google", normalized);
                for (const item of normalized) {
                    await importGoogleEventToCalendar(item, workspaceId, user.id);
                }
                break;
            }
            default:
                throw new Error("Provider not supported for sync");
        }

        await prisma.integration.updateMany({
            where: { workspaceId, provider },
            data: { updatedAt: new Date() }
        });

        return NextResponse.json({ success: true, count, created, updated });
    } catch (error: any) {
        console.error("Sync error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
