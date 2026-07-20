import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { signOAuthState, generateCodeChallenge } from "@/lib/crypto";
import { logger } from "@/lib/logger";

export interface SlackConfig {
  teamId: string;
  teamName: string;
  channelId?: string;
  channelName?: string;
}

const SLACK_API = "https://slack.com/api";

const SLACK_SCOPES = [
  "chat:write",
  "channels:read",
  "groups:read",
  "commands",
  "users:read",
  "channels:history",
].join(",");

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: any[];
  fields?: { type: string; text: string }[];
  accessory?: any;
  confirm?: any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAccessToken(workspaceId: string): Promise<string | null> {
  const integration = await prisma.integration.findFirst({
    where: { workspaceId, provider: "slack" },
  });
  if (!integration?.accessToken) return null;
  try {
    return decrypt(integration.accessToken);
  } catch {
    logger.error("Failed to decrypt Slack access token", { workspaceId });
    return null;
  }
}

async function getConfig(workspaceId: string): Promise<SlackConfig | null> {
  const integration = await prisma.integration.findFirst({
    where: { workspaceId, provider: "slack" },
  });
  if (!integration) return null;
  return (integration.config as unknown as SlackConfig) ?? null;
}

async function slackApi(
  method: string,
  token: string,
  body?: Record<string, unknown>
): Promise<any> {
  const res = await fetch(`${SLACK_API}.${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.ok) {
    logger.error(`Slack API ${method} failed`, data.error, data);
  }
  return data;
}

function escapeMrkdwn(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function statusEmoji(status: string): string {
  switch (status) {
    case "todo":
      return "⬜";
    case "in_progress":
    case "in-progress":
      return "🔵";
    case "done":
    case "completed":
      return "✅";
    case "blocked":
      return "🔴";
    default:
      return "▪️";
  }
}

function priorityEmoji(priority: string): string {
  switch (priority) {
    case "urgent":
    case "critical":
      return "🔴";
    case "high":
      return "🟠";
    case "medium":
      return "🟡";
    case "low":
      return "🟢";
    default:
      return "⚪";
  }
}

// ---------------------------------------------------------------------------
// 1. OAuth URL
// ---------------------------------------------------------------------------

export function getSlackAuthUrl(
  workspaceId: string,
  codeVerifier?: string
): string {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`;

  const statePayload: Record<string, any> = { workspaceId };
  let url =
    `https://slack.com/oauth/v2/authorize?client_id=${clientId}` +
    `&scope=${SLACK_SCOPES}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  if (codeVerifier) {
    statePayload.codeVerifier = codeVerifier;
    const challenge = generateCodeChallenge(codeVerifier);
    url += `&state=${encodeURIComponent(signOAuthState(statePayload))}` +
      `&code_challenge=${challenge}` +
      `&code_challenge_method=S256`;
  } else {
    url += `&state=${encodeURIComponent(signOAuthState(statePayload))}`;
  }

  return url;
}

// ---------------------------------------------------------------------------
// 2. Token Exchange
// ---------------------------------------------------------------------------

export async function exchangeSlackCode(
  code: string,
  codeVerifier?: string
): Promise<any> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`;

  const form = new URLSearchParams();
  form.append("code", code);
  form.append("client_id", clientId!);
  form.append("client_secret", clientSecret!);
  form.append("redirect_uri", redirectUri);
  if (codeVerifier) {
    form.append("code_verifier", codeVerifier);
  }

  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const data = await res.json();
  if (!data.ok) {
    logger.error("Slack OAuth exchange failed", data.error);
    throw new Error(data.error || "Failed to exchange Slack code");
  }
  return data;
}

// ---------------------------------------------------------------------------
// 3. Generic Workspace Notification
// ---------------------------------------------------------------------------

export async function notifyWorkspace(
  workspaceId: string,
  message: string,
  title?: string
): Promise<void> {
  try {
    const token = await getAccessToken(workspaceId);
    if (!token) return;
    const config = await getConfig(workspaceId);
    const channel = config?.channelId;
    if (!channel) return;

    const blocks: SlackBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: title ? `*${escapeMrkdwn(title)}*\n${message}` : message,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Sent from *Theta Platform* · <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toLocaleString()}>`,
          },
        ],
      },
    ];

    await slackApi("chat.postMessage", token, {
      channel,
      text: title ? `${title}: ${message}` : message,
      blocks,
    });
  } catch (error) {
    logger.error("Failed to send Slack notification", error);
  }
}

// ---------------------------------------------------------------------------
// 4. Rich Task Notification
// ---------------------------------------------------------------------------

export async function sendTaskNotification(
  workspaceId: string,
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string | Date | null;
    assigneeIds?: string[];
  },
  type: "created" | "updated" | "completed" | "assigned" | "commented"
): Promise<void> {
  try {
    const token = await getAccessToken(workspaceId);
    if (!token) return;
    const config = await getConfig(workspaceId);
    const channel = config?.channelId;
    if (!channel) return;

    const actionText: Record<string, string> = {
      created: "New task created",
      updated: "Task updated",
      completed: "Task completed",
      assigned: "Task assigned",
      commented: "New comment on task",
    };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const taskLink = `${appUrl}/tasks/${task.id}`;

    const dueStr = task.dueDate
      ? `<t:${Math.floor(new Date(task.dueDate).getTime() / 1000)}:date_long>`
      : "_No due date_";

    const blocks: SlackBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${statusEmoji(task.status)} ${escapeMrkdwn(task.title)}*`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Status*\n${task.status.replace(/_/g, " ")}` },
          { type: "mrkdwn", text: `*Priority*\n${priorityEmoji(task.priority)} ${task.priority}` },
          { type: "mrkdwn", text: `*Due*\n${dueStr}` },
          { type: "mrkdwn", text: `*Action*\n${actionText[type] ?? type}` },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View Task" },
            url: taskLink,
            action_id: "theta_view_task",
          },
        ],
      },
    ];

    await slackApi("chat.postMessage", token, {
      channel,
      text: `${actionText[type]}: ${task.title}`,
      blocks,
    });
  } catch (error) {
    logger.error("Failed to send task notification", error);
  }
}

// ---------------------------------------------------------------------------
// 5. Daily Standup Summary
// ---------------------------------------------------------------------------

export async function sendDailyStandup(
  workspaceId: string,
  projectId: string
): Promise<void> {
  try {
    const token = await getAccessToken(workspaceId);
    if (!token) return;
    const config = await getConfig(workspaceId);
    const channel = config?.channelId;
    if (!channel) return;

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const tasks = await prisma.task.findMany({
      where: { projectId, workspaceId },
      orderBy: [{ status: "asc" }, { priority: "desc" }],
    });

    const active = tasks.filter((t) => t.status === "in_progress");
    const completedToday = tasks.filter(
      (t) =>
        (t.status === "done" || t.status === "completed") &&
        t.completedAt &&
        t.completedAt >= startOfDay
    );
    const upcoming = tasks.filter(
      (t) =>
        t.status !== "done" &&
        t.status !== "completed" &&
        t.dueDate &&
        new Date(t.dueDate) <= new Date(now.getTime() + 2 * 86400000)
    );

    const taskLine = (t: (typeof tasks)[0]) =>
      `${statusEmoji(t.status)} ${escapeMrkdwn(t.title)} ${
        t.dueDate
          ? `· due <!date^${Math.floor(new Date(t.dueDate).getTime() / 1000)}^{date_short}|${new Date(t.dueDate).toLocaleDateString()}>`
          : ""
      }`;

    const project = await prisma.project.findUnique({ where: { id: projectId } });

    const sections: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📋 Daily Standup — ${project?.name ?? "Project"}`,
        },
      },
    ];

    if (active.length > 0) {
      sections.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*In Progress (${active.length})*\n${active.map(taskLine).join("\n")}`,
        },
      });
    }

    if (completedToday.length > 0) {
      sections.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Completed Today (${completedToday.length})*\n${completedToday.map(taskLine).join("\n")}`,
        },
      });
    }

    if (upcoming.length > 0) {
      sections.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Due Soon (${upcoming.length})*\n${upcoming.map(taskLine).join("\n")}`,
        },
      });
    }

    if (active.length === 0 && completedToday.length === 0 && upcoming.length === 0) {
      sections.push({
        type: "section",
        text: { type: "mrkdwn", text: "_No active tasks for this project today._" },
      });
    }

    sections.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Generated by *Theta* · ${tasks.length} total tasks`,
        },
      ],
    });

    await slackApi("chat.postMessage", token, {
      channel,
      text: `Daily standup for ${project?.name ?? "project"}`,
      blocks: sections,
    });

    logger.info("Daily standup sent", { workspaceId, projectId, total: tasks.length });
  } catch (error) {
    logger.error("Failed to send daily standup", error);
  }
}

// ---------------------------------------------------------------------------
// 6. Sprint Summary
// ---------------------------------------------------------------------------

export async function sendSprintSummary(
  workspaceId: string,
  sprint: {
    id: string;
    name: string;
    projectId: string;
    startDate: Date;
    endDate: Date;
    goal?: string | null;
    status: string;
  }
): Promise<void> {
  try {
    const token = await getAccessToken(workspaceId);
    if (!token) return;
    const config = await getConfig(workspaceId);
    const channel = config?.channelId;
    if (!channel) return;

    const tasks = await prisma.task.findMany({
      where: { projectId: sprint.projectId, workspaceId },
    });

    const completed = tasks.filter(
      (t) => t.status === "done" || t.status === "completed"
    );
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    const progressBar =
      "█".repeat(Math.round(completionRate / 10)) +
      "░".repeat(10 - Math.round(completionRate / 10));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: { type: "plain_text", text: `🏁 Sprint Summary: ${sprint.name}` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Status*\n${sprint.status}` },
          { type: "mrkdwn", text: `*Completion*\n${completionRate}% ${progressBar}` },
          {
            type: "mrkdwn",
            text: `*Period*\n<!date^${Math.floor(sprint.startDate.getTime() / 1000)}^{date_short} - |${sprint.startDate.toLocaleDateString()} - ><t:${Math.floor(sprint.endDate.getTime() / 1000)}:date_short>`,
          },
          { type: "mrkdwn", text: `*Tasks*\n${completed.length} / ${total} completed` },
        ],
      },
    ];

    if (sprint.goal) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `*Sprint Goal*\n${escapeMrkdwn(sprint.goal)}` },
      });
    }

    const byType = new Map<string, { done: number; total: number }>();
    for (const t of tasks) {
      const entry = byType.get(t.taskType) ?? { done: 0, total: 0 };
      entry.total++;
      if (t.status === "done" || t.status === "completed") entry.done++;
      byType.set(t.taskType, entry);
    }

    if (byType.size > 0) {
      const breakdown = Array.from(byType.entries())
        .map(([type, e]) => `· _${type}_ — ${e.done}/${e.total}`)
        .join("\n");
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `*By Type*\n${breakdown}` },
      });
    }

    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View in Theta" },
          url: `${appUrl}/projects/${sprint.projectId}/sprints/${sprint.id}`,
          action_id: "theta_view_sprint",
        },
      ],
    });

    await slackApi("chat.postMessage", token, {
      channel,
      text: `Sprint summary: ${sprint.name} — ${completionRate}% complete`,
      blocks,
    });

    logger.info("Sprint summary sent", { workspaceId, sprintId: sprint.id });
  } catch (error) {
    logger.error("Failed to send sprint summary", error);
  }
}

// ---------------------------------------------------------------------------
// 7. Slash Command Router
// ---------------------------------------------------------------------------

interface SlashPayload {
  command: string;
  text: string;
  user_id: string;
  user_name: string;
  team_id: string;
  channel_id: string;
  channel_name: string;
  response_url: string;
  trigger_id: string;
}

export async function handleSlashCommand(
  payload: SlashPayload
): Promise<{ text: string; blocks?: SlackBlock[] }> {
  const parts = payload.text.trim().split(/\s+/);
  const sub = parts[0]?.toLowerCase() ?? "";
  const args = parts.slice(1);

  switch (sub) {
    case "create":
      return handleCreateCommand(payload, args);
    case "status":
      return handleStatusCommand(payload, args);
    case "assign":
      return handleAssignCommand(payload, args);
    default:
      return {
        text: "Available commands: `/theta create <title>`, `/theta status <task-id>`, `/theta assign <task-id> @user`",
      };
  }
}

// ---------------------------------------------------------------------------
// 8. /theta create
// ---------------------------------------------------------------------------

async function handleCreateCommand(
  payload: SlashPayload,
  args: string[]
): Promise<{ text: string; blocks?: SlackBlock[] }> {
  if (args.length === 0) {
    return { text: "Usage: `/theta create <task title>`" };
  }

  const integration = await prisma.integration.findFirst({
    where: { workspaceId: payload.team_id, provider: "slack" },
  });

  let workspaceId = integration?.workspaceId;

  if (!workspaceId) {
    const member = await prisma.workspaceMember.findFirst({
      where: { user: { clerkId: payload.user_id } },
    });
    workspaceId = member?.workspaceId;
  }

  if (!workspaceId) {
    return { text: "Could not find a workspace linked to your Slack account." };
  }

  const projects = await prisma.project.findMany({
    where: { workspaceId },
    take: 1,
    orderBy: { createdAt: "desc" },
  });

  if (projects.length === 0) {
    return { text: "No projects found in your workspace. Create one first." };
  }

  const project = projects[0];
  const title = args.join(" ");

  const user = await prisma.user.findFirst({
    where: { clerkId: payload.user_id },
  });

  const task = await prisma.task.create({
    data: {
      title,
      workspaceId,
      projectId: project.id,
      userId: user?.id ?? project.userId,
      status: "todo",
      priority: "medium",
    },
  });

  return {
    text: `✅ Task created: *${title}*`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✅ *Task Created*\n*${escapeMrkdwn(task.title)}*\nProject: ${escapeMrkdwn(project.name)}`,
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 9. /theta status
// ---------------------------------------------------------------------------

async function handleStatusCommand(
  payload: SlashPayload,
  args: string[]
): Promise<{ text: string; blocks?: SlackBlock[] }> {
  if (args.length === 0) {
    return { text: "Usage: `/theta status <task-id>`" };
  }

  const taskId = args[0];

  let task;
  try {
    task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });
  } catch {
    return { text: `Task \`${taskId}\` not found.` };
  }

  if (!task) {
    return { text: `Task \`${taskId}\` not found.` };
  }

  const dueStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString()
    : "No due date";

  return {
    text: `${statusEmoji(task.status)} ${task.title} — ${task.status} / ${task.priority} / ${dueStr}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${statusEmoji(task.status)} ${escapeMrkdwn(task.title)}*`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Status*\n${task.status}` },
          { type: "mrkdwn", text: `*Priority*\n${priorityEmoji(task.priority)} ${task.priority}` },
          { type: "mrkdwn", text: `*Due*\n${dueStr}` },
          { type: "mrkdwn", text: `*Project*\n${escapeMrkdwn(task.project.name)}` },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 10. /theta assign
// ---------------------------------------------------------------------------

async function handleAssignCommand(
  payload: SlashPayload,
  args: string[]
): Promise<{ text: string; blocks?: SlackBlock[] }> {
  if (args.length < 2) {
    return { text: "Usage: `/theta assign <task-id> @user`" };
  }

  const taskId = args[0];
  const userRef = args[1].replace(/^@/, "");

  let task;
  try {
    task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });
  } catch {
    return { text: `Task \`${taskId}\` not found.` };
  }

  if (!task) {
    return { text: `Task \`${taskId}\` not found.` };
  }

  const member = await prisma.user.findFirst({
    where: {
      OR: [{ name: { contains: userRef, mode: "insensitive" } }, { email: { contains: userRef, mode: "insensitive" } }],
    },
  });

  if (!member) {
    return { text: `User \`${userRef}\` not found.` };
  }

  const assigneeIds = task.assigneeIds.includes(member.id)
    ? task.assigneeIds
    : [...task.assigneeIds, member.id];

  await prisma.task.update({
    where: { id: taskId },
    data: { assigneeIds },
  });

  return {
    text: `✅ Task \`${task.title}\` assigned to *${member.name ?? userRef}*`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✅ *Task Assigned*\n*${escapeMrkdwn(task.title)}* → *${escapeMrkdwn(member.name ?? userRef)}*`,
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 11. Message Action Handler
// ---------------------------------------------------------------------------

interface MessageActionPayload {
  type: string;
  callback_id: string;
  user: { id: string; name: string };
  channel: { id: string };
  team: { id: string };
  message: {
    text: string;
    user: string;
    ts: string;
    blocks?: any[];
  };
  trigger_id: string;
}

export async function handleMessageAction(
  payload: MessageActionPayload
): Promise<{ text: string; blocks?: SlackBlock[] }> {
  try {
    const integration = await prisma.integration.findFirst({
      where: { workspaceId: payload.team.id, provider: "slack" },
    });

    let workspaceId = integration?.workspaceId;

    if (!workspaceId) {
      const member = await prisma.workspaceMember.findFirst({
        where: { user: { clerkId: payload.user.id } },
      });
      workspaceId = member?.workspaceId;
    }

    if (!workspaceId) {
      return { text: "No workspace linked to this Slack team." };
    }

    return createTaskFromMessage(
      payload.message,
      payload.channel.id,
      workspaceId
    );
  } catch (error) {
    logger.error("Failed to handle message action", error);
    return { text: "Something went wrong. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// 12. Create Task from Message
// ---------------------------------------------------------------------------

async function createTaskFromMessage(
  message: { text: string; user: string; ts: string },
  channelId: string,
  workspaceId: string
): Promise<{ text: string; blocks?: SlackBlock[] }> {
  const projects = await prisma.project.findMany({
    where: { workspaceId },
    take: 1,
    orderBy: { createdAt: "desc" },
  });

  if (projects.length === 0) {
    return { text: "No projects found. Create one first." };
  }

  const project = projects[0];
  const title = message.text.length > 200 ? message.text.slice(0, 197) + "..." : message.text;

  const slackUser = await prisma.user.findFirst({
    where: { clerkId: message.user },
  });

  const task = await prisma.task.create({
    data: {
      title,
      description: `Created from Slack message in channel <#${channelId}> by <@${message.user}> at ${new Date(Number(message.ts) * 1000).toISOString()}\n\n> ${message.text}`,
      workspaceId,
      projectId: project.id,
      userId: slackUser?.id ?? project.userId,
      status: "todo",
      priority: "medium",
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  return {
    text: `✅ Task created from Slack message`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✅ *Task Created from Slack*\n*${escapeMrkdwn(task.title)}*\nProject: ${escapeMrkdwn(project.name)}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View Task" },
            url: `${appUrl}/tasks/${task.id}`,
            action_id: "theta_view_created_task",
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 13. Interactive Component Handler
// ---------------------------------------------------------------------------

interface InteractivePayload {
  type: string;
  user: { id: string; name: string };
  team: { id: string };
  channel?: { id: string };
  actions?: {
    action_id: string;
    type: string;
    selected_option?: { value: string; text: { text: string } };
    value?: string;
    text?: { text: string };
  }[];
  view?: {
    callback_id: string;
    state: { values: Record<string, any> };
  };
}

export async function handleInteractiveAction(
  payload: InteractivePayload
): Promise<any> {
  try {
    if (payload.actions?.[0]?.action_id === "theta_update_status") {
      const action = payload.actions[0];
      const taskId = action.selected_option?.value;
      const newStatus = action.value;

      if (taskId && newStatus) {
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (task) {
          const updateData: Record<string, any> = { status: newStatus };
          if (newStatus === "done" || newStatus === "completed") {
            updateData.completedAt = new Date();
          }
          await prisma.task.update({ where: { id: taskId }, data: updateData });
          return {
            text: `Task status updated to *${newStatus}*`,
            replace_original: false,
          };
        }
      }
      return { text: "Could not update task.", response_type: "ephemeral" };
    }

    if (payload.actions?.[0]?.action_id === "theta_update_priority") {
      const action = payload.actions[0];
      const taskId = action.selected_option?.value;
      const newPriority = action.value;

      if (taskId && newPriority) {
        await prisma.task.update({
          where: { id: taskId },
          data: { priority: newPriority },
        });
        return {
          text: `Task priority updated to *${newPriority}*`,
          replace_original: false,
        };
      }
      return { text: "Could not update priority.", response_type: "ephemeral" };
    }

    if (payload.actions?.[0]?.action_id?.startsWith("theta_view_task")) {
      return { text: "Opening task...", response_type: "ephemeral" };
    }

    return { text: "Unknown action.", response_type: "ephemeral" };
  } catch (error) {
    logger.error("Failed to handle interactive action", error);
    return { text: "Something went wrong.", response_type: "ephemeral" };
  }
}

// ---------------------------------------------------------------------------
// 14. Build Task Status Blocks
// ---------------------------------------------------------------------------

export function buildTaskStatusBlocks(task: {
  id: string;
  title: string;
  status: string;
  priority: string;
  taskType: string;
  dueDate?: Date | string | null;
  description?: string | null;
  progress?: number;
}): SlackBlock[] {
  const dueStr = task.dueDate
    ? `Due <!date^${Math.floor(new Date(task.dueDate).getTime() / 1000)}^{date_long}|${new Date(task.dueDate).toLocaleDateString()}>`
    : "_No due date_";

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${statusEmoji(task.status)} ${task.title}`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Status*\n${task.status.replace(/_/g, " ")}` },
        { type: "mrkdwn", text: `*Priority*\n${priorityEmoji(task.priority)} ${task.priority}` },
        { type: "mrkdwn", text: `*Type*\n${task.taskType}` },
        { type: "mrkdwn", text: `*Due*\n${dueStr}` },
      ],
    },
  ];

  if (task.description) {
    const desc =
      task.description.length > 300
        ? task.description.slice(0, 297) + "..."
        : task.description;
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: desc },
    });
  }

  if (task.progress !== undefined && task.progress > 0) {
    const filled = Math.round(task.progress / 10);
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Progress* ${task.progress}%\n${"█".repeat(filled)}${"░".repeat(10 - filled)}`,
      },
    });
  }

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "static_select",
        placeholder: { type: "plain_text", text: "Change status" },
        action_id: "theta_update_status",
        value: task.id,
        options: ["todo", "in_progress", "done", "blocked"].map((s) => ({
          text: { type: "plain_text", text: s.replace(/_/g, " ") },
          value: s,
        })),
      },
      {
        type: "static_select",
        placeholder: { type: "plain_text", text: "Change priority" },
        action_id: "theta_update_priority",
        value: task.id,
        options: ["low", "medium", "high", "urgent"].map((p) => ({
          text: { type: "plain_text", text: `${priorityEmoji(p)} ${p}` },
          value: p,
        })),
      },
    ],
  });

  return blocks;
}

// ---------------------------------------------------------------------------
// 15. Build Interactive Message
// ---------------------------------------------------------------------------

export function buildInteractiveMessage(task: {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: Date | string | null;
}): SlackBlock[] {
  const dueStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString()
    : "No due date";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${statusEmoji(task.status)} ${escapeMrkdwn(task.title)}*\nPriority: ${priorityEmoji(task.priority)} ${task.priority} · Due: ${dueStr}`,
      },
      accessory: {
        type: "static_select",
        placeholder: { type: "plain_text", text: "Status" },
        action_id: "theta_update_status",
        value: task.id,
        options: ["todo", "in_progress", "done", "blocked"].map((s) => ({
          text: { type: "plain_text", text: s.replace(/_/g, " ") },
          value: s,
        })),
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `ID: \`${task.id}\` · <${appUrl}/tasks/${task.id}|Open in Theta>`,
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 16. List Channels
// ---------------------------------------------------------------------------

export async function listChannels(
  workspaceId: string
): Promise<{ id: string; name: string; isPrivate: boolean }[]> {
  const token = await getAccessToken(workspaceId);
  if (!token) return [];

  const data = await slackApi("conversations.list", token, {
    types: "public_channel,private_channel",
    exclude_archived: true,
    limit: 200,
  });

  if (!data.ok) return [];

  return (data.channels ?? []).map((ch: any) => ({
    id: ch.id,
    name: ch.name,
    is_private: ch.is_private,
    isPrivate: ch.is_private,
  }));
}

// ---------------------------------------------------------------------------
// 17. Get Channel Info
// ---------------------------------------------------------------------------

export async function getChannelInfo(
  workspaceId: string,
  channelId: string
): Promise<{ id: string; name: string; topic: string; purpose: string; memberCount: number } | null> {
  const token = await getAccessToken(workspaceId);
  if (!token) return null;

  const data = await slackApi("conversations.info", token, {
    channel: channelId,
  });

  if (!data.ok || !data.channel) return null;

  const ch = data.channel;
  return {
    id: ch.id,
    name: ch.name,
    topic: ch.topic?.value ?? "",
    purpose: ch.purpose?.value ?? "",
    memberCount: ch.num_members ?? 0,
  };
}

// ---------------------------------------------------------------------------
// 18. Send Channel Message
// ---------------------------------------------------------------------------

export async function sendChannelMessage(
  workspaceId: string,
  channelId: string,
  message: string,
  blocks?: SlackBlock[]
): Promise<boolean> {
  try {
    const token = await getAccessToken(workspaceId);
    if (!token) return false;

    const payload: Record<string, any> = { channel: channelId, text: message };
    if (blocks && blocks.length > 0) {
      payload.blocks = blocks;
    }

    const data = await slackApi("chat.postMessage", token, payload);
    return data.ok;
  } catch (error) {
    logger.error("Failed to send channel message", error);
    return false;
  }
}
