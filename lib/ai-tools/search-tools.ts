import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SearchIntelligence } from "@/lib/nova/search-intelligence";
import { type ToolContext, type ToolModule, enforce } from "./index";

export function buildSearchTools(ctx: ToolContext): ToolModule {
  const { user, workspaceId } = ctx;

  return {
    saved_searches: {
      description: 'List all saved searches for the current user.',
      inputSchema: z.object({}),
      execute: async () => {
        await enforce(ctx, "read", "workspace");
        const searches = await SearchIntelligence.getSavedSearches(workspaceId, user.id);
        return { searches };
      }
    },
    save_search: {
      description: 'Save a search query for later reuse.',
      inputSchema: z.object({ name: z.string(), query: z.string(), domain: z.string().optional(), searchType: z.string().optional() }),
      execute: async ({ name, query, domain, searchType }: Record<string, unknown>) => {
        await enforce(ctx, "write", "workspace");
        const id = await SearchIntelligence.saveSearch(workspaceId, user.id, name as string, query as string, domain as string, searchType as string);
        return { success: true, message: `Search "**${name}**" saved.`, id };
      }
    },
    delete_saved_search: {
      description: 'Delete a saved search.',
      inputSchema: z.object({ searchId: z.string() }),
      execute: async ({ searchId }: Record<string, unknown>) => {
        await enforce(ctx, "delete", "workspace");
        const success = await SearchIntelligence.deleteSavedSearch(workspaceId, searchId as string, user.id);
        return { success, message: success ? "Saved search deleted." : "Failed to delete saved search." };
      }
    },
    pin_search: {
      description: 'Pin or unpin a saved search.',
      inputSchema: z.object({ searchId: z.string(), isPinned: z.boolean() }),
      execute: async ({ searchId, isPinned }: Record<string, unknown>) => {
        await enforce(ctx, "write", "workspace");
        const success = await SearchIntelligence.togglePinSearch(workspaceId, searchId as string, isPinned as boolean, user.id);
        return { success, message: `Search ${isPinned ? "pinned" : "unpinned"}.` };
      }
    },
  };
}
