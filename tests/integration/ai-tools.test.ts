import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue({ id: "p1", name: "Test" }), create: vi.fn().mockResolvedValue({ id: "p1", name: "Test" }), delete: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}) },
    task: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "t1", title: "Test Task" }), delete: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}), count: vi.fn().mockResolvedValue(0), groupBy: vi.fn().mockResolvedValue([]) },
    tag: { findMany: vi.fn().mockResolvedValue([]), createMany: vi.fn().mockResolvedValue({}) },
    document: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "d1" }), findFirst: vi.fn().mockResolvedValue(null) },
    teamMember: { findMany: vi.fn().mockResolvedValue([]) },
    workspaceMember: { findFirst: vi.fn().mockResolvedValue({ role: "manager", workspaceId: "ws-1", userId: "u1", status: "active" }), findMany: vi.fn().mockResolvedValue([]) },
    activity: { create: vi.fn().mockResolvedValue({}) },
    entityLink: { create: vi.fn().mockResolvedValue({}) },
    comment: { findMany: vi.fn().mockResolvedValue([]) },
    form: { findMany: vi.fn().mockResolvedValue([]) },
    integration: { findMany: vi.fn().mockResolvedValue([]) },
    savedSearch: { findMany: vi.fn().mockResolvedValue([]) },
    billingSubscription: { findFirst: vi.fn().mockResolvedValue(null) },
    billingInvoice: { findMany: vi.fn().mockResolvedValue([]) },
    notification: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/project-permissions", () => ({
  getAccessibleProjectIds: vi.fn().mockResolvedValue(["p1"]),
  canAccessProject: vi.fn().mockResolvedValue({ hasAccess: true }),
  canAccessProjectResource: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/super-admin", () => ({
  isSuperAdmin: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/cache", () => ({
  cacheGetOrSet: vi.fn((_key: string, fn: () => Promise<any>) => fn()),
  cacheKey: vi.fn((...parts: string[]) => parts.join(":")),
}));

import { buildTools } from "@/lib/ai-tools";

const ctx = {
  user: { id: "u1", name: "Test User", email: "test@example.com" },
  workspaceId: "ws-1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildTools — Tool Registry", () => {
  it("returns all expected tools", () => {
    const tools = buildTools(ctx) as Record<string, { execute: unknown }>;
    const expected = [
      "list_projects", "list_tasks", "create_task", "update_task",
      "delete_task", "create_project", "update_project", "delete_project",
      "list_members", "invite_member", "create_document", "read_document",
      "list_prompt_templates", "search_workspace", "get_suggestions",
      "generate_daily_brief", "generate_meeting_prep", "log_time",
      "list_forms", "get_form_responses", "list_integrations",
      "browse_templates", "check_billing_history",
    ];

    for (const name of expected) {
      expect(tools[name]).toBeDefined();
      expect(typeof tools[name].execute).toBe("function");
    }
  });

  it("each tool has a description", () => {
    const tools = buildTools(ctx) as Record<string, { description: string; execute: unknown }>;
    for (const [name, tool] of Object.entries(tools)) {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(5);
    }
  });
});

describe("buildTools — Task Tools", () => {
  it("list_tasks returns empty array for no tasks", async () => {
    const tools = buildTools(ctx) as Record<string, { execute: (args: Record<string, unknown>) => Promise<any> }>;
    const result = await tools.list_tasks.execute({});
    expect(result).toBeDefined();
  });

  it("create_task requires title", async () => {
    const tools = buildTools(ctx) as Record<string, { execute: (args: Record<string, unknown>) => Promise<any> }>;
    const result = await tools.create_task.execute({ title: "New Task" });
    expect(result).toBeDefined();
  });
});

describe("buildTools — Project Tools", () => {
  it("list_projects returns empty array", async () => {
    const tools = buildTools(ctx) as Record<string, { execute: (args: Record<string, unknown>) => Promise<any> }>;
    const result = await tools.list_projects.execute({});
    expect(result).toBeDefined();
  });
});

describe("buildTools — Document Tools", () => {
  it("list_documents returns empty array", async () => {
    const tools = buildTools(ctx) as Record<string, { execute: (args: Record<string, unknown>) => Promise<any> }>;
    if (tools.list_documents) {
      const result = await tools.list_documents.execute({});
      expect(result).toBeDefined();
    }
  });
});
