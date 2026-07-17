import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/langraph/models", () => ({
  getLangChainModel: vi.fn().mockReturnValue({}),
}));

import { routeModel } from "@/lib/langraph/model-router";

const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("ModelRouter — routeModel", () => {
  it("routes chat prompts to Gemini", () => {
    process.env.GEMINI_API_KEY = "test";
    const config = routeModel("hello, how are you?");
    expect(config.provider).toBe("gemini");
    expect(config.model).toBe("gemini-2.5-flash");
  });

  it("routes code prompts to OpenRouter/Claude", () => {
    process.env.OPENROUTER_API_KEY = "test";
    const config = routeModel("write a function to sort an array");
    expect(config.provider).toBe("openrouter");
    expect(config.model).toContain("claude");
  });

  it("routes reasoning prompts to OpenRouter/GPT-4o", () => {
    process.env.OPENROUTER_API_KEY = "test";
    const config = routeModel("why does this design pattern work?");
    expect(config.provider).toBe("openrouter");
    expect(config.model).toContain("gpt-4o");
  });

  it("routes analysis prompts to OpenRouter/GPT-4o", () => {
    process.env.OPENROUTER_API_KEY = "test";
    const config = routeModel("analyze team velocity metrics");
    expect(config.provider).toBe("openrouter");
    expect(config.model).toContain("gpt-4o");
  });

  it("routes retrieval prompts to Gemini", () => {
    process.env.GEMINI_API_KEY = "test";
    const config = routeModel("search for project documentation");
    expect(config.provider).toBe("gemini");
  });

  it("routes action prompts to Gemini", () => {
    process.env.GEMINI_API_KEY = "test";
    const config = routeModel("create a new task called Fix Bug");
    expect(config.provider).toBe("gemini");
  });

  it("routes creative prompts to Gemini", () => {
    process.env.GEMINI_API_KEY = "test";
    const config = routeModel("draft a project brief for the new feature");
    expect(config.provider).toBe("gemini");
  });

  it("falls back when primary provider unavailable", () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.OPENROUTER_API_KEY = "test";
    const config = routeModel("hello there");
    expect(config.provider).toBe("openrouter");
  });

  it("returns fallback when no providers available", () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.COHERE_API_KEY;
    const config = routeModel("hello");
    expect(config.provider).toBe("openrouter");
  });
});
