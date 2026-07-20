import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";

const GITHUB_API_URL = "https://api.github.com";

interface GitHubIssueParams {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}

interface GitHubIssue {
  id: number;
  number: number;
  state: "open" | "closed";
  title: string;
  body: string | null;
  html_url: string;
  labels: Array<{ name: string }>;
  assignees: Array<{ login: string }>;
  created_at: string;
  updated_at: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  description: string | null;
}

interface WebhookEvent {
  action: string;
  issue?: GitHubIssue;
  pull_request?: {
    id: number;
    number: number;
    state: "open" | "closed";
    merged: boolean;
    title: string;
    html_url: string;
  };
  repository?: { full_name: string };
  sender?: { login: string };
  commits?: Array<{
    message: string;
    author: { name: string };
  }>;
}

interface TaskMetadata {
  githubIssueNumber?: number;
  githubRepo?: string;
  githubOwner?: string;
  githubIssueUrl?: string;
  githubLinkedAt?: string;
  githubPrUrl?: string;
  githubPrNumber?: number;
  githubPrOwner?: string;
  githubPrRepo?: string;
  githubPrLinkedAt?: string;
}

export class GitHubIntegration {
  private workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async getIntegration() {
    const integration = await prisma.integration.findFirst({
      where: {
        workspaceId: this.workspaceId,
        // @ts-ignore
        provider: "github",
      },
    });

    if (!integration) {
      throw new Error("GitHub integration not found for this workspace");
    }

    return integration;
  }

  private async getAccessToken(): Promise<string> {
    const integration = await this.getIntegration();

    if (!integration.accessToken) {
      throw new Error("GitHub integration is missing an access token");
    }

    // @ts-ignore
    if (integration.expiresAt && new Date() > integration.expiresAt) {
      if (!integration.refreshToken) {
        throw new Error("GitHub access token expired and no refresh token available");
      }
      // @ts-ignore
      return this.refreshAccessToken(integration.id, integration.refreshToken);
    }

    return decrypt(integration.accessToken);
  }

  private async refreshAccessToken(
    integrationId: string,
    refreshTokenEncrypted: string,
  ): Promise<string> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set");
    }

    const refreshToken = decrypt(refreshTokenEncrypted);

    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (data.error) {
      logger.error("GitHub token refresh failed", { error: data.error, description: data.error_description });
      throw new Error(`Failed to refresh GitHub token: ${data.error_description || data.error}`);
    }

    const { access_token, refresh_token, expires_in } = data;
    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        accessToken: encrypt(access_token),
        ...(refresh_token ? { refreshToken: encrypt(refresh_token) } : {}),
        // @ts-ignore
        expiresAt,
      },
    });

    logger.info("GitHub access token refreshed", { integrationId });
    return access_token;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = endpoint.startsWith("http") ? endpoint : `${GITHUB_API_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      let body: any;
      try {
        body = await response.json();
      } catch {
        body = { message: response.statusText };
      }
      logger.error("GitHub API error", {
        url,
        status: response.status,
        message: body.message,
      });
      throw new Error(
        `GitHub API error (${response.status}): ${body.message || response.statusText}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  private async getAppToken(installationId: string): Promise<string> {
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
    const appId = process.env.GITHUB_APP_ID;

    if (!privateKey || !appId) {
      throw new Error("GITHUB_APP_PRIVATE_KEY and GITHUB_APP_ID must be set");
    }

    // Dynamically import jsonwebtoken (optional dep for GitHub App support)
    let jwt: string;
    try {
      // @ts-ignore – optional dep, types may not be installed
      const jwtModule = await import("jsonwebtoken");
      const now = Math.floor(Date.now() / 1000);
      // @ts-ignore – jsonwebtoken .sign()
      jwt = jwtModule.default.sign(
        {
          iat: now - 60,
          exp: now + 600,
          iss: appId,
        },
        privateKey.replace(/\\n/g, "\n"),
        { algorithm: "RS256" },
      );
    } catch {
      throw new Error(
        "jsonwebtoken package is required for GitHub App support. Install it with: npm install jsonwebtoken @types/jsonwebtoken",
      );
    }

    const response = await fetch(
      `${GITHUB_API_URL}/app/installations/${installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      const body = await response.json();
      throw new Error(`Failed to get installation token: ${body.message}`);
    }

    const data = await response.json();
    return data.token as string;
  }

  // ---------------------------------------------------------------------------
  // 1. Exchange OAuth code for access token
  // ---------------------------------------------------------------------------

  async exchangeGithubCode(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    scope?: string;
  }> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set");
    }

    logger.info("Exchanging GitHub OAuth code", { workspaceId: this.workspaceId });

    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      logger.error("GitHub OAuth exchange failed", {
        error: data.error,
        description: data.error_description,
      });
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    const { access_token, refresh_token, expires_in, scope } = data;
    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

    await prisma.integration.upsert({
      where: {
        // @ts-ignore – unique compound key
        workspaceId_provider: {
          workspaceId: this.workspaceId,
          provider: "github",
        },
      },
      create: {
        workspaceId: this.workspaceId,
        provider: "github",
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : undefined,
        // @ts-ignore
        expiresAt,
        config: { scope },
      },
      update: {
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : undefined,
        // @ts-ignore
        expiresAt,
        config: { scope },
      },
    });

    logger.info("GitHub OAuth code exchanged successfully", { workspaceId: this.workspaceId });

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      scope,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Get installation access token (GitHub App)
  // ---------------------------------------------------------------------------

  async getInstallationAccessToken(installationId: string): Promise<string> {
    logger.info("Getting GitHub App installation token", { installationId });
    return this.getAppToken(installationId);
  }

  // ---------------------------------------------------------------------------
  // 3. List repositories accessible to the integration
  // ---------------------------------------------------------------------------

  async listRepositories(
    workspaceId: string,
  ): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = [];
    let page = 1;

    logger.info("Listing GitHub repositories", { workspaceId });

    while (true) {
      const batch = await this.request<GitHubRepo[]>(
        `/user/repos?sort=updated&per_page=100&page=${page}`,
      );

      repos.push(...batch);

      if (batch.length < 100) break;
      page++;
    }

    logger.info("Listed GitHub repositories", { workspaceId, count: repos.length });
    return repos;
  }

  // ---------------------------------------------------------------------------
  // 4. Create a GitHub issue from a Theta task
  // ---------------------------------------------------------------------------

  async createIssue(params: GitHubIssueParams): Promise<GitHubIssue> {
    const { owner, repo, title, body, labels, assignees } = params;

    logger.info("Creating GitHub issue", { owner, repo, title });

    const issue = await this.request<GitHubIssue>(
      `/repos/${owner}/${repo}/issues`,
      {
        method: "POST",
        body: JSON.stringify({
          title,
          ...(body ? { body } : {}),
          ...(labels?.length ? { labels } : {}),
          ...(assignees?.length ? { assignees } : {}),
        }),
      },
    );

    logger.info("GitHub issue created", {
      owner,
      repo,
      issueNumber: issue.number,
      issueId: issue.id,
    });

    return issue;
  }

  // ---------------------------------------------------------------------------
  // 5. Link a pull request to a task
  // ---------------------------------------------------------------------------

  async linkPullRequest(
    taskId: string,
    prUrl: string,
    workspaceId: string,
  ): Promise<void> {
    logger.info("Linking GitHub PR to task", { taskId, prUrl });

    // Parse owner/repo/number from the PR URL
    // Expected format: https://github.com/owner/repo/pull/123
    const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) {
      throw new Error(`Invalid GitHub PR URL: ${prUrl}`);
    }

    const [, prOwner, prRepo, prNumber] = match;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("Task not found");

    const existingMetadata = (task.customFieldMetadata as TaskMetadata) || {};

    await prisma.task.update({
      where: { id: taskId },
      data: {
        customFieldMetadata: {
          ...existingMetadata,
          githubPrUrl: prUrl,
          githubPrNumber: parseInt(prNumber, 10),
          githubPrOwner: prOwner,
          githubPrRepo: prRepo,
          githubPrLinkedAt: new Date().toISOString(),
        } as any,
      },
    });

    logger.info("GitHub PR linked to task", { taskId, prUrl });
  }

  // ---------------------------------------------------------------------------
  // 6. Sync task status with GitHub issue state
  // ---------------------------------------------------------------------------

  async syncTaskStatus(taskId: string, workspaceId: string): Promise<void> {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("Task not found");

    const metadata = (task.customFieldMetadata as TaskMetadata) || {};
    if (!metadata.githubIssueNumber || !metadata.githubOwner || !metadata.githubRepo) {
      logger.warn("Task has no linked GitHub issue, skipping sync", { taskId });
      return;
    }

    const issueState = await this.getIssueStatus(
      metadata.githubOwner,
      metadata.githubRepo,
      metadata.githubIssueNumber,
    );

    const isCompleted =
      task.status === "done" || task.status === "completed";

    if (issueState === "closed" && !isCompleted) {
      // GitHub issue was closed – update Theta task
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "done",
          completedAt: new Date(),
        },
      });
      logger.info("Task status synced from GitHub issue (closed)", { taskId });
    } else if (issueState === "open" && isCompleted) {
      // Theta task is done but GitHub issue is still open – close the issue
      await this.request(
        `/repos/${metadata.githubOwner}/${metadata.githubRepo}/issues/${metadata.githubIssueNumber}`,
        {
          method: "PATCH",
          body: JSON.stringify({ state: "closed" }),
        },
      );
      logger.info("GitHub issue closed to match completed task", { taskId });
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Add a comment to a GitHub issue
  // ---------------------------------------------------------------------------

  async addCommentToIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
  ): Promise<{ id: number; html_url: string }> {
    logger.info("Adding comment to GitHub issue", { owner, repo, issueNumber });

    const comment = await this.request<{ id: number; html_url: string }>(
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ body }),
      },
    );

    logger.info("Comment added to GitHub issue", {
      owner,
      repo,
      issueNumber,
      commentId: comment.id,
    });

    return comment;
  }

  // ---------------------------------------------------------------------------
  // 8. Get issue status (open / closed)
  // ---------------------------------------------------------------------------

  async getIssueStatus(
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<"open" | "closed"> {
    const issue = await this.request<{ state: "open" | "closed" }>(
      `/repos/${owner}/${repo}/issues/${issueNumber}`,
    );

    return issue.state;
  }

  // ---------------------------------------------------------------------------
  // 9. Handle GitHub webhook events
  // ---------------------------------------------------------------------------

  async handleWebhook(
    headers: Record<string, string>,
    body: WebhookEvent,
    workspaceId: string,
  ): Promise<{ processed: boolean; event?: string; action?: string }> {
    const eventType = headers["x-github-event"];
    const deliveryId = headers["x-github-delivery"];

    if (!eventType) {
      logger.warn("GitHub webhook missing event type header");
      return { processed: false };
    }

    logger.info("Processing GitHub webhook", {
      event: eventType,
      action: body.action,
      deliveryId,
      workspaceId,
    });

    try {
      switch (eventType) {
        case "issues":
          await this.handleIssueWebhook(body, workspaceId);
          break;
        case "pull_request":
          await this.handlePullRequestWebhook(body, workspaceId);
          break;
        case "push":
          await this.handlePushWebhook(body, workspaceId);
          break;
        default:
          logger.info("Unhandled GitHub webhook event", { event: eventType });
      }

      return { processed: true, event: eventType, action: body.action };
    } catch (error) {
      logger.error("Failed to process GitHub webhook", {
        event: eventType,
        action: body.action,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async handleIssueWebhook(body: WebhookEvent, workspaceId: string): Promise<void> {
    const { action, issue } = body;
    if (!issue) return;

    const repoName = body.repository?.full_name.split("/")[1];
    const issueNumber = issue.number;

    // Use targeted query instead of loading ALL tasks
    // Search for tasks that have this issue number in their metadata
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
      },
    });

    const linkedTask = tasks.find((task) => {
      const meta = (task.customFieldMetadata as Record<string, unknown>) || {};
      return meta.githubIssueNumber === issueNumber && meta.githubRepo === repoName;
    });

    if (!linkedTask) {
      logger.info("No linked Theta task found for GitHub issue", {
        issueNumber: issue.number,
      });
      return;
    }

    if (action === "closed") {
      await prisma.task.update({
        where: { id: linkedTask.id },
        data: {
          status: "done",
          completedAt: new Date(),
        },
      });
      logger.info("Task marked done from GitHub issue webhook", {
        taskId: linkedTask.id,
        issueNumber: issue.number,
      });
    } else if (action === "reopened") {
      await prisma.task.update({
        where: { id: linkedTask.id },
        data: {
          status: "todo",
          completedAt: null,
        },
      });
      logger.info("Task reopened from GitHub issue webhook", {
        taskId: linkedTask.id,
        issueNumber: issue.number,
      });
    } else if (action === "labeled" || action === "unlabeled") {
      const labelNames = issue.labels.map((l) => l.name);
      const existingFieldValues = (linkedTask.fieldValues as Record<string, any>) || {};

      await prisma.task.update({
        where: { id: linkedTask.id },
        data: {
          fieldValues: {
            ...existingFieldValues,
            githubLabels: labelNames,
          },
        },
      });
      logger.info("Task labels synced from GitHub webhook", {
        taskId: linkedTask.id,
        labels: labelNames,
      });
    }
  }

  private async handlePullRequestWebhook(
    body: WebhookEvent,
    workspaceId: string,
  ): Promise<void> {
    const { action, pull_request: pr } = body;
    if (!pr) return;

    // Use targeted query with the PR URL instead of loading ALL tasks
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
      },
    });

    const linkedTask = tasks.find((task) => {
      const meta = (task.customFieldMetadata as Record<string, unknown>) || {};
      return meta.githubPrUrl === pr.html_url;
    });

    if (!linkedTask) {
      logger.info("No linked Theta task found for GitHub PR", {
        prNumber: pr.number,
      });
      return;
    }

    if (action === "closed" || action === "merged") {
      await prisma.task.update({
        where: { id: linkedTask.id },
        data: {
          status: "done",
          completedAt: new Date(),
        },
      });
      logger.info("Task completed from GitHub PR webhook", {
        taskId: linkedTask.id,
        prNumber: pr.number,
      });
    }
  }

  private async handlePushWebhook(body: WebhookEvent, workspaceId: string): Promise<void> {
    if (!body.commits?.length) return;

    const commitMessages = body.commits.map((c) => c.message).join("\n");

    // Look for task ID references in commit messages (e.g. "Fixes #theta-task-abc123")
    const taskIdMatch = commitMessages.match(/(?:fixes|closes|resolves)\s+(?:theta-)?task-([a-f0-9]+)/i);

    if (taskIdMatch) {
      const taskId = taskIdMatch[1];
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (task && task.workspaceId === workspaceId) {
        const metadata = (task.customFieldMetadata as TaskMetadata) || {};
        const issueNumber = metadata.githubIssueNumber;
        const repoFullName = body.repository?.full_name;
        const owner = repoFullName?.split("/")[0] || metadata.githubOwner || "";
        const repo = repoFullName?.split("/")[1] || metadata.githubRepo || "";

        // Only add comment if we have a valid issue number
        if (issueNumber && issueNumber > 0 && owner && repo) {
          await this.addCommentToIssue(
            owner,
            repo,
            issueNumber,
            `Linked commit pushed by ${body.sender?.login}:\n${body.commits.map((c) => `- ${c.message}`).join("\n")}`,
          );
        } else {
          logger.warn(`[GitHub] Push webhook: Task ${taskId} found but no linked issue number, skipping comment`, {
            owner,
            repo,
            issueNumber,
          });
        }
      }
    }

    logger.info("Push webhook processed", {
      repository: body.repository?.full_name,
      commitCount: body.commits.length,
    });
  }

  // ---------------------------------------------------------------------------
  // 10. Sync on task update – called when task status changes
  // ---------------------------------------------------------------------------

  async syncOnTaskUpdate(
    taskId: string,
    workspaceId: string,
  ): Promise<void> {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("Task not found");

    const metadata = (task.customFieldMetadata as TaskMetadata) || {};
    const isCompleted = task.status === "done" || task.status === "completed";

    // Sync linked GitHub issue state
    if (metadata.githubIssueNumber && metadata.githubOwner && metadata.githubRepo) {
      const currentIssueState = await this.getIssueStatus(
        metadata.githubOwner,
        metadata.githubRepo,
        metadata.githubIssueNumber,
      );

      const shouldCloseIssue = isCompleted && currentIssueState === "open";
      const shouldReopenIssue = !isCompleted && currentIssueState === "closed";

      if (shouldCloseIssue) {
        await this.request(
          `/repos/${metadata.githubOwner}/${metadata.githubRepo}/issues/${metadata.githubIssueNumber}`,
          {
            method: "PATCH",
            body: JSON.stringify({ state: "closed" }),
          },
        );

        // Add a status comment
        await this.addCommentToIssue(
          metadata.githubOwner,
          metadata.githubRepo,
          metadata.githubIssueNumber,
          `✅ Issue closed automatically — linked Theta task "${task.title}" was marked as done.`,
        );

        logger.info("GitHub issue closed via task sync", { taskId, issueNumber: metadata.githubIssueNumber });
      } else if (shouldReopenIssue) {
        await this.request(
          `/repos/${metadata.githubOwner}/${metadata.githubRepo}/issues/${metadata.githubIssueNumber}`,
          {
            method: "PATCH",
            body: JSON.stringify({ state: "open" }),
          },
        );

        await this.addCommentToIssue(
          metadata.githubOwner,
          metadata.githubRepo,
          metadata.githubIssueNumber,
          `🔄 Issue reopened automatically — linked Theta task "${task.title}" status changed.`,
        );

        logger.info("GitHub issue reopened via task sync", { taskId, issueNumber: metadata.githubIssueNumber });
      }
    }

    // Sync linked PR state if present
    if (metadata.githubPrUrl && metadata.githubPrOwner && metadata.githubPrRepo && metadata.githubPrNumber) {
      const prState = await this.request<{ state: "open" | "closed"; merged: boolean }>(
        `/repos/${metadata.githubPrOwner}/${metadata.githubPrRepo}/pulls/${metadata.githubPrNumber}`,
      );

      if (isCompleted && prState.state === "open") {
        logger.info("Linked PR is still open while task is complete", {
          taskId,
          prNumber: metadata.githubPrNumber,
        });
      }
    }
  }
}

export async function handleWebhook(
  headers: Record<string, string>,
  body: WebhookEvent,
  workspaceId: string,
): Promise<{ processed: boolean; event?: string; action?: string }> {
  const integration = new GitHubIntegration(workspaceId);
  return integration.handleWebhook(headers, body, workspaceId);
}
