# THETA PM REBUILD IMPLEMENTATION PLAN

> **Current State:** 38/100
> **Target State:** 70+/100 (competitive with mid-tier PM tools)
> **Timeline:** 12 weeks
> **Framework:** Inngest for background jobs, React Native for mobile

---

## PHASE 1: FIX THE BROKEN FOUNDATIONS (Week 1-3)

> Goal: Stop the bleeding. Fix what's broken. Make the product trustworthy.

### 1.1 -- Fix Analytics (Workspace-Scoped)

**File:** `lib/analytics-api.ts:91-111`

**Problem:** `getWorkspaceMetrics()` accepts `workspaceId` but never uses it. All queries are global.

**Fix:**
- Add workspace filtering to all PostHog queries
- Add `properties` filter with `$current_workspace_id` to every query
- Create a proper `getWorkspaceAnalytics()` function that queries the Prisma database directly (task counts, completion rates, overdue counts) instead of relying solely on PostHog
- Add workspace-scoped PostHog events: when creating/completing tasks, send `workspace_id` as a property
- Implement proper burndown, velocity, and workload charts from database queries

**New implementation:**
```typescript
export async function getWorkspaceMetrics(workspaceId: string, since = "-30d") {
  const now = new Date();
  const sinceDate = new Date(now.getTime() - parseDuration(since));

  const [totalTasks, completedTasks, overdueTasks, tasksByStatus, tasksByPriority, recentActivity] = await Promise.all([
    prisma.task.count({ where: { workspaceId, createdAt: { gte: sinceDate } } }),
    prisma.task.count({ where: { workspaceId, status: "completed", updatedAt: { gte: sinceDate } } }),
    prisma.task.count({ where: { workspaceId, dueDate: { lt: now }, status: { notIn: ["completed", "cancelled"] } } }),
    prisma.task.groupBy({ by: ["status"], where: { workspaceId }, _count: true }),
    prisma.task.groupBy({ by: ["priority"], where: { workspaceId }, _count: true }),
    prisma.activity.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return {
    totals: {
      tasks: totalTasks,
      completedTasks,
      overdueTasks,
      pendingTasks: totalTasks - completedTasks,
      projects: await prisma.project.count({ where: { workspaceId } }),
      projectCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    },
    tasksByStatus: tasksByStatus.map(s => ({ status: s.status, count: s._count })),
    tasksByPriority: tasksByPriority.map(p => ({ priority: p.priority, count: p._count })),
    tasksOverTime: calculateTasksOverTime(recentActivity),
    teamProductivity: await calculateTeamProductivity(workspaceId),
    mostActiveProjects: await getMostActiveProjects(workspaceId),
  };
}
```

### 1.2 -- Fix Rate Limiter (Lua Script)

**File:** `lib/rate-limit.ts`

**Problem:** Fixed-window rate limiter with race condition. Two concurrent requests can both pass the check.

**Fix:**
- Replace with sliding-window rate limiter using Redis Lua script
- Lua script is atomic -- no race condition possible
- Use `redis.eval()` with a Lua script that checks and increments atomically

**New implementation:**
```typescript
const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count current entries
local count = redis.call('ZCARD', key)

if count < limit then
  redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
  redis.call('EXPIRE', key, window / 1000)
  return 1
else
  return 0
end
`;

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const result = await redis.eval(SLIDING_WINDOW_SCRIPT, [key], [windowMs, limit, now]);
  return result === 1;
}
```

### 1.3 -- Fix Email System

**File:** `lib/email.ts:31, 90`

**Problem:** Personal email address `ezekiel@thetapm.site`. No unsubscribe links. Missing transactional emails.

**Fix:**
- Change `from` to `noreply@thetapm.site` or `notifications@thetapm.site`
- Add unsubscribe links to all non-transactional emails (CAN-SPAM/GDPR compliance)
- Add missing email types:
  - Password reset
  - Project invitation (different from workspace invite)
  - Task assignment notification
  - Mention notification
  - Sprint start/end
  - Automation triggered
- Add plain-text fallback for all HTML emails
- Add email preferences (what emails to receive)

### 1.4 -- Fix Cache (Replace KEYS with SCAN)

**File:** `lib/cache.ts:47-55`

**Problem:** `redis.keys(pattern)` is O(n) and blocks Redis in production.

**Fix:**
- Replace `redis.keys()` with `redis.scan()` which is non-blocking
- Use cursor-based iteration to find matching keys
- Delete keys in batches of 100

**New implementation:**
```typescript
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== 0);
  } catch {
    // cache invalidation failure is non-fatal
  }
}
```

### 1.5 -- Fix Free Tier

**File:** `lib/plan-limits.ts:46-70`

**Problem:** 25 tasks, 3 users. Most restrictive in the market.

**Fix:**
- Increase free tier to be competitive:
  - Unlimited tasks (or at least 500)
  - 10 users
  - 10 projects
  - 10 boards
  - 1GB storage
  - 50 Nova AI requests/month
  - Basic integrations (2)
- This allows real evaluation of the product
- Upsell through advanced features (automations, analytics, custom fields), not basic functionality

**Updated limits:**
```typescript
free: {
  maxWorkspaces: 1,
  maxProjects: 10,
  maxTasks: 500,
  maxTeams: 3,
  maxMembers: 10,
  maxBoards: 10,
  maxCalendarEvents: 50,
  maxStorage: 1024,     // 1GB
  maxFileSize: 10,
  hasNovaAI: true,
  maxNovaRequests: 50,
  hasCustomAutomation: false,
  maxAutomations: 0,
  hasIntegrations: true,
  maxIntegrations: 2,
  hasAdvancedAnalytics: false,
  hasPrioritySupport: false,
  hasCustomFields: false,
  hasWhiteLabel: false,
  hasAPIAccess: false,
  maxAPIRequests: 0,
  activityHistoryDays: 90,
  maxChatMessages: 500,
},
```

### 1.6 -- Fix NGN Conversion Rate

**File:** `lib/billing-plans.ts:161-163`

**Problem:** Hardcoded `1250` NGN rate.

**Fix:**
- Remove the hardcoded fallback
- Always use the dynamic conversion from `getPlanPriceDynamic()`
- Add error handling that returns an error instead of a wrong price
- Cache the exchange rate for 1 hour to avoid excessive API calls

---

## PHASE 2: MAKE CORE FEATURES WORK (Week 3-6)

> Goal: Features that users actually interact with daily. Automations, integrations, exports, templates.

### 2.1 -- Functional Automation Executor

**File:** `lib/inngest/functions/automation-executor.ts:1-56`

**Problem:** Automation executor only logs to activity. No actions are taken.

**Fix:**
- Implement the actual action execution engine
- Support these action types:
  - `create_task` -- Create a new task
  - `update_task` -- Update task fields (status, priority, assignee)
  - `send_notification` -- Send notification to user/team
  - `send_message` -- Send message to channel
  - `move_task` -- Move task to different column/board
  - `add_comment` -- Add comment to task
  - `update_custom_field` -- Update custom field value
- Add trigger evaluation: when a task is created/updated/completed, check all automation rules for that workspace
- Add condition evaluation: check if trigger data matches automation conditions
- Add error handling: if an action fails, log it and continue with other actions

**New implementation:**
```typescript
export const executeAutomation = inngest.createFunction(
  { id: "nova-execute-automation", triggers: [{ event: "automation/triggered" }] },
  async ({ event, step }) => {
    const { ruleId, triggerType, context } = event.data;

    // 1. Load the automation rule
    const rule = await step.run("load-rule", async () => {
      return prisma.automationRule.findUnique({ where: { id: ruleId } });
    });

    if (!rule || !rule.enabled) return { executed: false, reason: "rule_disabled" };

    // 2. Evaluate conditions
    const conditionsMet = await step.run("evaluate-conditions", async () => {
      return evaluateConditions(rule.conditions, context);
    });

    if (!conditionsMet) return { executed: false, reason: "conditions_not_met" };

    // 3. Execute actions
    const results = await step.run("execute-actions", async () => {
      const results = [];
      for (const action of rule.actions) {
        try {
          const result = await executeAction(action, context);
          results.push({ action: action.type, success: true, result });
        } catch (error) {
          results.push({ action: action.type, success: false, error: error.message });
        }
      }
      return results;
    });

    // 4. Log execution
    await step.run("log-execution", async () => {
      await prisma.activity.create({
        data: {
          action: "automation_executed",
          entityType: "automation",
          entityId: ruleId,
          workspaceId: context.workspaceId,
          userId: context.userId,
          metadata: { triggerType, results, executedAt: new Date().toISOString() },
        },
      });
    });

    return { executed: true, results };
  }
);

async function executeAction(action: AutomationAction, context: Record<string, unknown>) {
  switch (action.type) {
    case "create_task":
      return prisma.task.create({
        data: {
          title: action.params.title,
          projectId: action.params.projectId || context.projectId,
          workspaceId: context.workspaceId,
          createdById: context.userId,
          status: action.params.status || "todo",
          priority: action.params.priority || "medium",
          assignees: action.params.assigneeId ? {
            create: [{ userId: action.params.assigneeId }]
          } : undefined,
        },
      });
    case "update_task":
      return prisma.task.update({
        where: { id: context.taskId },
        data: action.params,
      });
    case "send_notification":
      return createNotification(
        action.params.userId || context.userId,
        context.workspaceId,
        "automation_alert",
        action.params.title,
        action.params.message,
      );
    // ... other action types
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}
```

### 2.2 -- Real Task Analytics

**New file:** `lib/analytics/task-analytics.ts`

**Problem:** No burndown, velocity, or workload charts. Analytics dashboard shows global data.

**Fix:**
- Implement burndown chart: tasks remaining vs ideal line over sprint/project duration
- Implement velocity chart: tasks completed per week over last 12 weeks
- Implement workload chart: tasks per team member with capacity indicators
- Implement cumulative flow: tasks in each status over time
- Use database queries, not PostHog, for accurate workspace-scoped data

### 2.3 -- Bidirectional GitHub Integration

**File:** `lib/services/githubService.ts`

**Problem:** Read-only. Can see repos but can't create issues, link PRs, or push updates.

**Fix:**
- Add write operations:
  - `createIssue()` -- Create GitHub issue from Theta task
  - `linkPullRequest()` -- Link PR to Theta task
  - `syncStatus()` -- Sync task status with GitHub issue status
  - `addComment()` -- Add comment to GitHub issue
- Add webhook receiver: when PR is merged or issue is closed in GitHub, update Theta task
- Add real-time sync: when task status changes in Theta, update GitHub issue
- Store GitHub issue/PR IDs in task metadata for linking

### 2.4 -- Bidirectional Slack Integration

**New file:** `lib/integrations/slack-bidirectional.ts`

**Problem:** Basic Slack integration exists but is one-way.

**Fix:**
- Add Slash commands:
  - `/theta create <task>` -- Create task from Slack
  - `/theta status <task>` -- Check task status
  - `/theta assign <task> @user` -- Assign task
- Add message actions:
  - "Create Theta task from message" -- Right-click any message to create a task
  - "Link to Theta task" -- Link a message to an existing task
- Add channel notifications:
  - When task is completed, notify the channel
  - When task is blocked, notify the channel
  - Daily standup summary in a channel
- Add interactive components:
  - Task status dropdown in messages
  - Priority selector
  - Assignee selector

### 2.5 -- Full Data Export

**File:** `lib/export/export-service.ts:1-43`

**Problem:** Only exports timeline data. PDF is `window.print()`.

**Fix:**
- Add export types:
  - `tasks` -- Export all tasks with all fields (CSV/JSON/PDF)
  - `projects` -- Export project data with task counts
  - `boards` -- Export board data with column/task mappings
  - `documents` -- Export documents as Markdown
  - `chat` -- Export team chat messages
  - `activities` -- Export activity log
  - `analytics` -- Export analytics data
- Implement proper PDF generation using `jspdf` + `html2canvas`
- Add export scheduling: daily/weekly export via email
- Add export filters: date range, project, status, assignee

**New implementation:**
```typescript
export async function exportData(options: ExportOptions) {
  const { format, type, workspaceId, filters } = options;

  let data: unknown[];
  let filename: string;

  switch (type) {
    case "tasks":
      data = await prisma.task.findMany({
        where: { workspaceId, ...buildFilters(filters) },
        include: { assignees: true, subtasks: true, dependencies: true },
      });
      filename = `theta-tasks-${formatDate()}`;
      break;
    case "projects":
      data = await prisma.project.findMany({
        where: { workspaceId },
        include: { _count: { select: { tasks: true } } },
      });
      filename = `theta-projects-${formatDate()}`;
      break;
    // ... other types
  }

  switch (format) {
    case "csv":
      return exportCSV(data, filename);
    case "json":
      return exportJSON(data, filename);
    case "pdf":
      return exportPDF(data, filename);
  }
}
```

### 2.6 -- Template Library (50+ Templates)

**File:** `lib/constants/templates.ts:1-35`

**Problem:** 14 templates total. Competitors have 200-1,000+.

**Fix:**
- Create 50+ templates across categories:
  - **Engineering:** Sprint planning, bug triage, code review, deployment checklist, incident response
  - **Marketing:** Content calendar, campaign launch, social media schedule, SEO audit, email sequence
  - **Sales:** Pipeline stages, deal tracking, proposal template, follow-up sequence, onboarding
  - **HR:** Employee onboarding, performance review, time-off request, job description, exit interview
  - **Design:** Design brief, brand guidelines, UX research, wireframe review, asset handoff
  - **Operations:** Meeting agenda, project retrospective, vendor evaluation, budget planning, risk assessment
  - **Product:** PRD, user story, competitive analysis, feature prioritization, launch checklist
- Each template should include:
  - Pre-built tasks with dependencies
  - Board columns configured
  - Custom fields set up
  - Automation rules (basic)
  - Sample documents

---

## PHASE 3: COMPETITIVE FEATURE PARITY (Week 6-9)

> Goal: Features that competitors have that Theta doesn't. Close the gap.

### 3.1 -- Sprint Management

**New file:** `lib/services/sprint-service.ts`

**Problem:** No sprint management. Linear, Jira, and ClickUp all have mature sprint features.

**Fix:**
- Create Sprint model in Prisma schema:
  ```prisma
  model Sprint {
    id          String   @id @default(cuid())
    name        String
    projectId   String
    startDate   DateTime
    endDate     DateTime
    goal        String?
    status      String   @default("planned") // planned, active, completed
    workspaceId String
    tasks       Task[]
  }
  ```
- Add sprint board view: drag tasks between sprints
- Add sprint planning: estimate tasks, assign to sprint
- Add sprint retrospective: burndown, velocity, completed vs committed
- Add sprint automation: auto-complete sprint on date, move incomplete tasks to next sprint

### 3.2 -- Custom Fields UI

**Problem:** Custom fields schema exists in database but no UI to manage them.

**Fix:**
- Create custom field editor in project settings
- Field types: text, number, date, dropdown, checkbox, person, URL
- Show custom fields in task detail view
- Allow filtering/sorting by custom fields
- Add custom field templates per project type

### 3.3 -- Forms with Branching Logic

**File:** `lib/services/forms.ts` (new)

**Problem:** Basic forms. Missing branching logic, conditional fields.

**Fix:**
- Add form builder with drag-and-drop
- Field types: text, textarea, number, date, dropdown, checkbox, radio, file upload
- Branching logic: show/hide fields based on previous answers
- Form submissions create tasks automatically
- Form responses stored and viewable in dashboard
- Embed forms via iframe or link

### 3.4 -- Goals/OKRs

**New file:** `lib/services/goals-service.ts`

**Problem:** No goals/OKRs. ClickUp, Monday, and Asana all have this.

**Fix:**
- Create Goal model:
  ```prisma
  model Goal {
    id          String   @id @default(cuid())
    title       String
    description String?
    type        String   // okr, milestone, target
    ownerId     String
    projectId   String?
    workspaceId String
    startDate   DateTime
    endDate     DateTime
    status      String   @default("active")
    keyResults  KeyResult[]
  }
  ```
- Key results linked to tasks (progress auto-calculated)
- Goal dashboard: progress bars, alignment view
- Goal check-ins: weekly updates from goal owners
- Goal rollup: portfolio-level goal tracking

### 3.5 -- Time Tracking with Timer

**File:** `lib/services/time-tracking.ts` (new)

**Problem:** Basic time logging. Missing timer, reports, billable rates.

**Fix:**
- Add start/stop timer in task detail
- Manual time entry (hours + minutes)
- Time tracking reports: by project, by team member, by date range
- Billable rate tracking: hourly rate per team member, billable vs non-billable
- Time estimates vs actuals comparison
- Export time data for invoicing

### 3.6 -- Advanced Automations

**File:** `lib/services/automation-builder.ts` (new)

**Problem:** Basic automation UI exists but executor is a stub.

**Fix:**
- Visual automation builder (if-this-then-that style)
- Triggers: task created, status changed, due date passed, assignee changed, custom field changed
- Conditions: field equals, field contains, date comparison, user role
- Actions: create task, update task, send notification, send email, move to board, add comment
- Multi-step automations: chain actions together
- NL-to-automation via LLM: "When a task is marked done, notify the project owner and move to the next column"

---

## PHASE 4: DIFFERENTIATION (Week 9-12)

> Goal: What Theta can do that competitors can't. Unique positioning.

### 4.1 -- Mobile App (React Native)

**New directory:** `mobile/`

**Problem:** No mobile app. Monday has 43% mobile usage. This is a dealbreaker.

**Fix:**
- React Native with Expo for cross-platform (iOS + Android)
- Core features on mobile:
  - Task list with swipe actions
  - Kanban board with drag-and-drop
  - Quick task creation (voice + text)
  - Notifications with deep links
  - Time tracking timer
  - Offline support (queue actions, sync when online)
- Push notifications via Expo Push Notification Service
- Deep linking: notification opens correct screen
- Biometric auth (Face ID / fingerprint)

### 4.2 -- MCP Server (Model Context Protocol)

**New file:** `lib/mcp/server.ts`

**Problem:** Every competitor now has an MCP server. This lets external AI tools read/write workspace data.

**Fix:**
- Implement MCP server that exposes Theta's workspace data
- Resources: tasks, projects, documents, team members, chat messages
- Tools: create_task, update_task, search_tasks, get_project_stats
- Allow external tools (Claude, ChatGPT, custom agents) to interact with Theta
- This makes Theta an "AI platform" not just an "AI tool"

### 4.3 -- Advanced Automation Rules (NL-to-Automation)

**File:** `lib/services/nl-automation.ts` (new)

**Problem:** Current automation builder is manual. Competitors use AI to create automations from natural language.

**Fix:**
- Accept natural language input: "When a task is moved to Done, notify the client and create a follow-up task"
- Use LLM to parse into structured automation rule:
  ```json
  {
    "trigger": { "type": "task_status_changed", "from": "*", "to": "done" },
    "actions": [
      { "type": "send_notification", "target": "client", "message": "Task completed" },
      { "type": "create_task", "title": "Follow-up: {task.title}", "assignee": "{task.assignee}" }
    ]
  }
  ```
- Validate with Zod schema
- Store and execute via Inngest
- This is what Monday.com does with their AI Blocks

### 4.4 -- Rich Document Editor

**File:** `components/documents/` (new)

**Problem:** Basic document CRUD. Missing rich editor, templates, wiki-style linking.

**Fix:**
- Implement BlockNote or TipTap rich text editor
- Support: headings, lists, code blocks, tables, images, embeds
- Wiki-style linking: `[[Document Name]]` to link documents
- Document templates: PRD, meeting notes, technical spec
- Real-time collaboration via Ably (already installed)
- Document versioning: track changes, restore previous versions
- Export documents as PDF/Markdown

### 4.5 -- Advanced Reporting Dashboard

**File:** `components/analytics/advanced-dashboard.tsx` (new)

**Problem:** Basic analytics. Missing burndown, velocity, workload charts.

**Fix:**
- Sprint burndown chart
- Velocity chart (tasks completed per week)
- Workload distribution chart
- Cumulative flow diagram
- Time tracking reports
- Custom report builder: drag and drop metrics
- Export reports as PDF
- Schedule report delivery via email

---

## IMPLEMENTATION ORDER

| Phase | Week | Task | Impact | Effort |
|---|---|---|---|---|
| 1.1 | 1 | Fix analytics (workspace-scoped) | HIGH | MEDIUM |
| 1.2 | 1 | Fix rate limiter (Lua script) | HIGH | LOW |
| 1.3 | 1-2 | Fix email system | HIGH | LOW |
| 1.4 | 2 | Fix cache (replace KEYS with SCAN) | HIGH | LOW |
| 1.5 | 2 | Fix free tier | HIGH | LOW |
| 1.6 | 2 | Fix NGN conversion rate | MEDIUM | LOW |
| 2.1 | 3-4 | Functional automation executor | HIGH | HIGH |
| 2.2 | 3-4 | Real task analytics | HIGH | MEDIUM |
| 2.3 | 4-5 | Bidirectional GitHub integration | HIGH | MEDIUM |
| 2.4 | 5 | Bidirectional Slack integration | HIGH | MEDIUM |
| 2.5 | 5-6 | Full data export | MEDIUM | MEDIUM |
| 2.6 | 6 | Template library (50+) | MEDIUM | MEDIUM |
| 3.1 | 6-7 | Sprint management | HIGH | HIGH |
| 3.2 | 7 | Custom fields UI | MEDIUM | MEDIUM |
| 3.3 | 7-8 | Forms with branching logic | MEDIUM | MEDIUM |
| 3.4 | 8 | Goals/OKRs | MEDIUM | MEDIUM |
| 3.5 | 8-9 | Time tracking with timer | MEDIUM | MEDIUM |
| 3.6 | 9 | Advanced automations | HIGH | MEDIUM |
| 4.1 | 9-11 | Mobile app (React Native) | HIGH | VERY HIGH |
| 4.2 | 10-11 | MCP server | HIGH | HIGH |
| 4.3 | 11 | NL-to-automation via LLM | MEDIUM | MEDIUM |
| 4.4 | 11-12 | Rich document editor | MEDIUM | HIGH |
| 4.5 | 12 | Advanced reporting dashboard | MEDIUM | MEDIUM |

---

## ESTIMATED OUTCOME

| Metric | Before | After |
|---|---|---|
| **Overall Rating** | **38/100** | **70-75/100** |
| Core Task Management | 55/100 | 70/100 |
| Board Views (Kanban) | 60/100 | 75/100 |
| Gantt/Timeline | 40/100 | 60/100 |
| Automations | 5/100 | 55/100 |
| Analytics/Reporting | 10/100 | 60/100 |
| Integrations | 15/100 | 50/100 |
| Templates | 10/100 | 45/100 |
| Data Export | 15/100 | 55/100 |
| Mobile | 0/100 | 40/100 |
| Sprints | 0/100 | 50/100 |
| Goals/OKRs | 0/100 | 40/100 |
| Free Tier | 15/100 | 60/100 |
| Billing System | 85/100 | 90/100 |
| Notification System | 80/100 | 85/100 |

---

## COMPETITIVE BENCHMARK

| Platform | Current Rating | Theta After Rebuild | Gap After Rebuild |
|---|---|---|---|
| ClickUp | 85/100 | 70-75/100 | **10-15 points behind** |
| Monday.com | 82/100 | 70-75/100 | **7-12 points behind** |
| Asana | 80/100 | 70-75/100 | **5-10 points behind** |
| Linear | 85/100 | 70-75/100 | **10-15 points behind** |
| Trello | 70/100 | 70-75/100 | **Parity** |
| **Theta** | **38/100** | **70-75/100** | **Baseline** |

---

> **Theta won't catch ClickUp/Linear in 12 weeks.** But it will go from "tech demo" to "legitimate mid-tier competitor with unique pricing and billing." The mobile app, MCP server, and NL-to-automation could become genuine differentiators if executed well. The free tier improvement alone will drive signups.
