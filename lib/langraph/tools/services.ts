import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { LangGraphToolContext } from "./wrapper";

export function buildServiceTools(ctx: LangGraphToolContext): DynamicStructuredTool[] {
  return [
    new DynamicStructuredTool({
      name: "github_get_repositories",
      description: "Fetch all GitHub repositories for the authenticated user.",
      schema: z.object({}),
      func: async () => {
        const { GitHubService } = await import("@/lib/services/githubService");
        const service = new GitHubService(ctx.workspaceId);
        return service.getRepositories();
      },
    }),
    new DynamicStructuredTool({
      name: "github_get_commits",
      description: "Fetch recent commits for a GitHub repository.",
      schema: z.object({ owner: z.string(), repo: z.string() }),
      func: async ({ owner, repo }) => {
        const { GitHubService } = await import("@/lib/services/githubService");
        const service = new GitHubService(ctx.workspaceId);
        return service.getCommits(owner as string, repo as string);
      },
    }),
    new DynamicStructuredTool({
      name: "asana_get_projects",
      description: "Fetch all Asana projects.",
      schema: z.object({}),
      func: async () => {
        const { AsanaService } = await import("@/lib/services/asanaService");
        const service = new AsanaService(ctx.workspaceId);
        return service.getProjects();
      },
    }),
    new DynamicStructuredTool({
      name: "asana_get_tasks",
      description: "Fetch tasks for an Asana project.",
      schema: z.object({ projectGid: z.string() }),
      func: async ({ projectGid }) => {
        const { AsanaService } = await import("@/lib/services/asanaService");
        const service = new AsanaService(ctx.workspaceId);
        return service.getTasks(projectGid as string);
      },
    }),
    new DynamicStructuredTool({
      name: "trello_get_boards",
      description: "Get Trello boards for the workspace.",
      schema: z.object({}),
      func: async () => {
        const { TrelloService } = await import("@/lib/services/trelloService");
        const service = new TrelloService(ctx.workspaceId);
        return service.getBoards();
      },
    }),
    new DynamicStructuredTool({
      name: "bitbucket_get_repositories",
      description: "Fetch Bitbucket repositories for the authenticated user.",
      schema: z.object({}),
      func: async () => {
        const { BitbucketService } = await import("@/lib/services/bitbucketService");
        const service = new BitbucketService(ctx.workspaceId);
        return service.getRepositories();
      },
    }),
    new DynamicStructuredTool({
      name: "bitbucket_get_pull_requests",
      description: "Fetch pull requests for a Bitbucket repository.",
      schema: z.object({ workspace: z.string(), repo: z.string() }),
      func: async ({ workspace, repo }) => {
        const { BitbucketService } = await import("@/lib/services/bitbucketService");
        const service = new BitbucketService(ctx.workspaceId);
        return service.getPullRequests(workspace as string, repo as string);
      },
    }),
    new DynamicStructuredTool({
      name: "woocommerce_get_products",
      description: "Fetch all products from the WooCommerce store.",
      schema: z.object({}),
      func: async () => {
        const { WooCommerceService } = await import("@/lib/services/woocommerceService");
        const service = new WooCommerceService(ctx.workspaceId);
        return service.getProducts();
      },
    }),
    new DynamicStructuredTool({
      name: "woocommerce_get_orders",
      description: "Fetch recent orders from the WooCommerce store.",
      schema: z.object({}),
      func: async () => {
        const { WooCommerceService } = await import("@/lib/services/woocommerceService");
        const service = new WooCommerceService(ctx.workspaceId);
        return service.getOrders();
      },
    }),
  ];
}
