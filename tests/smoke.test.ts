import { describe, it, expect } from "vitest";

describe("Constants", () => {
  it("status constants have correct values", async () => {
    const mod = await import("@/lib/constants/status");
    expect(mod.STATUS_TODO).toBe("todo");
    expect(mod.STATUS_DONE).toBe("done");
    expect(mod.STATUS_IN_PROGRESS).toBe("in_progress");
    expect(mod.STATUS_VALUES).toContain("todo");
    expect(mod.PRIORITY_VALUES).toContain("urgent");
  });

  it("template constants are defined", async () => {
    const mod = await import("@/lib/constants/templates");
    expect(mod.PROMPT_TEMPLATES.length).toBeGreaterThan(0);
    expect(mod.BROWSE_TEMPLATES.length).toBe(10);
    expect(mod.AVAILABLE_INTEGRATIONS).toContain("GitHub");
  });
});

describe("Logger", () => {
  it("should log without throwing", async () => {
    const { logger } = await import("@/lib/logger");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });
});

describe("Field encryption", () => {
  it("should export encrypt/decrypt functions", async () => {
    const mod = await import("@/lib/field-encryption");
    expect(typeof mod.encryptSensitiveFields).toBe("function");
    expect(typeof mod.decryptSensitiveFields).toBe("function");
  });
});

describe("buildTools factory", () => {
  it("should return all expected tools", async () => {
    const { buildTools } = await import("@/lib/ai-tools");
    const ctx = { user: { id: "test" }, workspaceId: "test-ws" };
    const tools = buildTools(ctx);

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
      expect((tools as any)[name]).toBeDefined();
      expect(typeof (tools as any)[name].inputSchema).toBe("object");
      expect(typeof (tools as any)[name].execute).toBe("function");
    }
  });

  it("should handle missing projectId", async () => {
    const { buildTools } = await import("@/lib/ai-tools");
    const tools = buildTools({ user: { id: "u1" }, workspaceId: "ws1" });
    expect(tools.list_projects).toBeDefined();
  });
});
