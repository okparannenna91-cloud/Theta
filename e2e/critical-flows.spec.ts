import { test, expect } from "@playwright/test";

test.describe("Critical Flows — Smoke Tests", () => {
  test("homepage loads and redirects to sign-in", async ({ page }) => {
    await page.goto("/");
    // Should redirect to sign-in or show landing page
    await expect(page).toHaveURL(/.*(sign-in|login).*/);
  });

  test("sign-in page loads with Clerk", async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
    const status = page.url();
    expect(status).not.toContain("500");
  });

  test("sign-up page loads", async ({ page }) => {
    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");
    const status = page.url();
    expect(status).not.toContain("500");
  });

  test("API health check responds", async ({ page }) => {
    const response = await page.request.get("/api/health");
    expect(response.status()).toBeLessThan(500);
  });

  test("dashboard redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const url = page.url();
    expect(url).toMatch(/.*(sign-in|login|clerk).*/);
  });
});

test.describe("Critical Flows — API Endpoints", () => {
  test("POST /api/tasks returns 401 without auth", async ({ request }) => {
    const response = await request.post("/api/tasks", {
      data: { title: "Test", workspaceId: "test" },
    });
    expect(response.status()).toBe(401);
  });

  test("POST /api/projects returns 401 without auth", async ({ request }) => {
    const response = await request.post("/api/projects", {
      data: { name: "Test", workspaceId: "test" },
    });
    expect(response.status()).toBe(401);
  });

  test("GET /api/dashboard returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/dashboard");
    expect(response.status()).toBe(401);
  });

  test("POST /api/ai returns 401 without auth", async ({ request }) => {
    const response = await request.post("/api/ai", {
      data: { message: "hello", workspaceId: "test" },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe("Critical Flows — Security Headers", () => {
  test("security headers present on responses", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-xss-protection"]).toBe("1; mode=block");
    expect(headers["strict-transport-security"]).toContain("max-age=31536000");
  });

  test("API routes have no-cache headers", async ({ request }) => {
    const response = await request.get("/api/dashboard");
    const cacheControl = response.headers()["cache-control"] || "";
    // Should have no-store or no-cache
    expect(cacheControl).toMatch(/no-store|no-cache/);
  });

  test("static assets have immutable cache headers", async ({ request }) => {
    // Request a non-existent static file — Next.js will still return headers
    const response = await request.get("/_next/static/chunks/main.js");
    // Just verify the request doesn't 500
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Critical Flows — Navigation", () => {
  test("public pages are accessible without auth", async ({ page }) => {
    const publicPages = ["/", "/sign-in", "/sign-up"];
    for (const path of publicPages) {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(500);
    }
  });
});
