import { prisma } from "../prisma";
import type { Prisma } from "@prisma/client";
import { SEARCH_DOMAINS, SEARCH_TYPES, SEARCH_RANKING_PRINCIPLES, SEARCH_INTELLIGENCE_RULES, type SearchDomain, type SearchType } from "./constitution/search-standards";

export { SEARCH_DOMAINS, SEARCH_TYPES, SEARCH_RANKING_PRINCIPLES, SEARCH_INTELLIGENCE_RULES, type SearchDomain, type SearchType } from "./constitution/search-standards";

export interface SearchQueryScope {
  domain: SearchDomain;
  searchType: SearchType;
  query: string;
  contextual: boolean;
}

export class SearchIntelligence {
  public static parseQuery(query: string): SearchQueryScope {
    const lower = query.toLowerCase().trim();

    let domain: SearchDomain = "GLOBAL";
    let searchType: SearchType = "KEYWORD";
    let contextual = false;

    if (lower.includes("task") || lower.includes("todo") || lower.includes("bug") || lower.includes("issue")) {
      domain = "TASKS";
    } else if (lower.includes("project") || lower.includes("epic") || lower.includes("milestone")) {
      domain = "PROJECTS";
    } else if (lower.includes("document") || lower.includes("spec") || lower.includes("notes") || lower.includes("prd") || lower.includes("doc")) {
      domain = "DOCUMENTS";
    } else if (lower.includes("sprint")) {
      domain = "SPRINTS";
    } else if (lower.includes("report")) {
      domain = "REPORTS";
    } else if (lower.includes("knowledge") || lower.includes("wiki") || lower.includes("guide")) {
      domain = "KNOWLEDGE_BASE";
    }

    if (lower.includes("how") || lower.includes("why") || lower.includes("who") || lower.includes("what") || lower.split(" ").length > 3) {
      searchType = "QUESTION_ANSWERING";
    } else if (lower.split(" ").length > 2) {
      searchType = "SEMANTIC";
    }

    if (lower.includes("here") || lower.includes("current") || lower.includes("my")) {
      contextual = true;
    }

    return { domain, searchType, query, contextual };
  }

  public static getSearchDomains() {
    return SEARCH_DOMAINS;
  }

  public static getRankingPrinciples() {
    return SEARCH_RANKING_PRINCIPLES;
  }

  public static getRules() {
    return SEARCH_INTELLIGENCE_RULES;
  }

  public static async saveSearch(
    workspaceId: string,
    userId: string,
    name: string,
    query: string,
    domain: string = "GLOBAL",
    searchType: string = "KEYWORD",
    filters?: Record<string, unknown>
  ): Promise<string | null> {
    try {
      
      const saved = await prisma.savedSearch.create({
        data: { workspaceId, userId, name, query, domain, searchType, filters: (filters ?? {}) as Prisma.InputJsonValue },
      });
      return saved.id;
    } catch (error) {
      console.warn("[SearchIntelligence] Failed to save search:", error);
      return null;
    }
  }

  public static async getSavedSearches(
    workspaceId: string,
    userId: string
  ): Promise<Array<{ id: string; name: string; query: string; domain: string; searchType: string; isPinned: boolean }>> {
    try {
      
      return await prisma.savedSearch.findMany({
        where: { workspaceId, userId },
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        select: { id: true, name: true, query: true, domain: true, searchType: true, isPinned: true },
      });
    } catch (error) {
      console.warn("[SearchIntelligence] Failed to get saved searches:", error);
      return [];
    }
  }

  public static async deleteSavedSearch(workspaceId: string, searchId: string, userId?: string): Promise<boolean> {
    try {
      const where: { id: string; workspaceId: string; userId?: string } = { id: searchId, workspaceId };
      if (userId) where.userId = userId;
      await prisma.savedSearch.delete({ where });
      return true;
    } catch (error) {
      console.warn("[SearchIntelligence] Failed to delete saved search:", error);
      return false;
    }
  }

  public static async togglePinSearch(workspaceId: string, searchId: string, isPinned: boolean, userId?: string): Promise<boolean> {
    try {
      const where: { id: string; workspaceId: string; userId?: string } = { id: searchId, workspaceId };
      if (userId) where.userId = userId;
      await prisma.savedSearch.update({ where, data: { isPinned } });
      return true;
    } catch (error) {
      console.warn("[SearchIntelligence] Failed to toggle pin:", error);
      return false;
    }
  }
}
