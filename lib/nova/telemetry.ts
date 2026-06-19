import { redis } from "@/lib/redis/client";
import { logger } from "@/lib/logger";
import { getToolCategory } from "@/lib/ai-tools/registry";

const TELEMETRY_PREFIX = "nova:telemetry";

function key(...parts: string[]): string {
  return `${TELEMETRY_PREFIX}:${parts.join(":")}`;
}

function safeIncr(k: string): void {
  redis.incr(k).catch(() => {});
}

function safePipelined(ops: Array<{ cmd: string; args: (string | number)[] }>): void {
  Promise.allSettled(
    ops.map((op) => {
      const r = redis as any;
      const fn = r[op.cmd]?.bind(r);
      if (fn) return fn(...op.args);
      return Promise.resolve();
    }),
  ).catch(() => {});
}

export const telemetry = {
  trackRequest(opts: {
    userId: string;
    workspaceId: string;
    path: "CHAT" | "ACTION" | "ANALYSIS";
    intent: string;
    strategy: string;
    totalDurationMs: number;
    contextLoadMs?: number;
    toolBuildMs?: number;
    llmLatencyMs?: number;
    routingLatencyMs?: number;
    model?: string;
    provider?: string;
    estimatedTokens?: number;
    estimatedCost?: number;
    success: boolean;
    errorType?: string;
    errorMessage?: string;
  }) {
    const now = Date.now();
    const day = new Date().toISOString().slice(0, 10);
    const ops: Array<{ cmd: string; args: (string | number)[] }> = [
      { cmd: "incr", args: [key("requests", "total")] },
      { cmd: "incr", args: [key("requests", "by_day", day)] },
      { cmd: "incr", args: [key("requests", "by_workspace", opts.workspaceId)] },
      { cmd: "incr", args: [key("requests", "by_user", opts.userId)] },
      { cmd: "incr", args: [key("requests", "by_path", opts.path)] },
    ];

    if (!opts.success) {
      const errType = opts.errorType || "unknown";
      ops.push({ cmd: "incr", args: [key("errors", errType)] });
      ops.push({ cmd: "incr", args: [key("errors", "total")] });
    }

    ops.push({ cmd: "zadd", args: [key("latency", "all"), now, `${opts.totalDurationMs}:${opts.userId.slice(0, 8)}`] });
    ops.push({ cmd: "zadd", args: [key("latency", `path:${opts.path}`), now, `${opts.totalDurationMs}:${opts.userId.slice(0, 8)}`] });

    if (opts.estimatedCost) {
      ops.push({ cmd: "hincrbyfloat", args: [key("costs", "total"), opts.model || "unknown", opts.estimatedCost] });
    }

    safePipelined(ops);
  },

  trackToolExecution(opts: {
    userId: string;
    workspaceId: string;
    toolName: string;
    success: boolean;
    durationMs: number;
    errorMessage?: string;
    category?: string;
  }) {
    const now = Date.now();
    const cat = opts.category || getToolCategory(opts.toolName) || "uncategorized";
    const ops: Array<{ cmd: string; args: (string | number)[] }> = [
      { cmd: "incr", args: [key("tools", "total_calls")] },
      { cmd: "incr", args: [key("tools", "by_name", opts.toolName, "calls")] },
      { cmd: "incr", args: [key("tools", "by_category", cat, "calls")] },
      { cmd: "zadd", args: [key("tools", "duration", opts.toolName), now, `${now}:${opts.durationMs}`] },
    ];

    if (opts.success) {
      ops.push({ cmd: "incr", args: [key("tools", "by_name", opts.toolName, "success")] });
      ops.push({ cmd: "incr", args: [key("tools", "by_category", cat, "success")] });
    } else {
      ops.push({ cmd: "incr", args: [key("tools", "by_name", opts.toolName, "failure")] });
      ops.push({ cmd: "incr", args: [key("tools", "by_category", cat, "failure")] });
      if (opts.errorMessage) {
        ops.push({ cmd: "incr", args: [key("tools", "errors", opts.toolName)] });
      }
    }

    safePipelined(ops);
  },

  async getDashboard(workspaceId?: string, hours = 24): Promise<Record<string, unknown>> {
    const since = Date.now() - hours * 60 * 60 * 1000;
    const day = new Date().toISOString().slice(0, 10);

    const recentEntries = await redis.zrange(key("latency", "all"), since, "+inf", { byScore: true });

    const latencyValues: number[] = [];
    if (Array.isArray(recentEntries)) {
      for (const entry of recentEntries as string[]) {
        const colonIdx = (entry as string).indexOf(":");
        if (colonIdx > 0) {
          const val = parseInt((entry as string).slice(0, colonIdx), 10);
          if (!isNaN(val)) latencyValues.push(val);
        }
      }
    }

    latencyValues.sort((a, b) => a - b);
    const len = latencyValues.length;

    const calcPercentile = (p: number) => {
      if (len === 0) return 0;
      const idx = Math.ceil((p / 100) * len) - 1;
      return latencyValues[Math.max(0, idx)];
    };

    const totalReq = parseInt((await redis.get(key("requests", "total"))) || "0", 10);
    const dayReq = parseInt((await redis.get(key("requests", "by_day", day))) || "0", 10);
    const chatCount = parseInt((await redis.get(key("requests", "by_path", "CHAT"))) || "0", 10);
    const actionCount = parseInt((await redis.get(key("requests", "by_path", "ACTION"))) || "0", 10);
    const analysisCount = parseInt((await redis.get(key("requests", "by_path", "ANALYSIS"))) || "0", 10);
    const totalErrors = parseInt((await redis.get(key("errors", "total"))) || "0", 10);
    const totalToolCalls = parseInt((await redis.get(key("tools", "total_calls"))) || "0", 10);

    const errorTypesRaw = await redis.keys(key("errors", "*"));
    const errorTypes: Record<string, number> = {};
    if (Array.isArray(errorTypesRaw)) {
      for (const ek of errorTypesRaw) {
        const label = ek.replace(`${TELEMETRY_PREFIX}:errors:`, "");
        if (label !== "total") {
          errorTypes[label] = parseInt((await redis.get(ek)) || "0", 10);
        }
      }
    }

    const costRaw = await redis.hgetall(key("costs", "total"));
    const costs: Record<string, number> = {};
    if (costRaw && typeof costRaw === "object") {
      for (const [model, val] of Object.entries(costRaw)) {
        costs[model] = parseFloat(val as string);
      }
    }

    const toolNamesRaw = await redis.keys(key("tools", "by_name", "*", "calls"));
    const topTools: Array<{ name: string; calls: number; success: number; failure: number }> = [];
    if (Array.isArray(toolNamesRaw)) {
      for (const tk of toolNamesRaw) {
        const name = tk.replace(`${TELEMETRY_PREFIX}:tools:by_name:`, "").replace(":calls", "");
        const calls = parseInt((await redis.get(tk)) || "0", 10);
        const success = parseInt((await redis.get(key("tools", "by_name", name, "success"))) || "0", 10);
        const failure = parseInt((await redis.get(key("tools", "by_name", name, "failure"))) || "0", 10);
        topTools.push({ name, calls, success, failure });
      }
    }
    topTools.sort((a, b) => b.calls - a.calls);

    const totalCost = Object.values(costs).reduce((s, v) => s + v, 0);

    const result: Record<string, unknown> = {
      period: { hours },
      requests: {
        total: totalReq,
        today: dayReq,
        byPath: { CHAT: chatCount, ACTION: actionCount, ANALYSIS: analysisCount },
        routing: {
          chatPercent: totalReq > 0 ? Math.round((chatCount / totalReq) * 100) : 0,
          actionPercent: totalReq > 0 ? Math.round((actionCount / totalReq) * 100) : 0,
          analysisPercent: totalReq > 0 ? Math.round((analysisCount / totalReq) * 100) : 0,
        },
      },
      latency: {
        count: len,
        p50: calcPercentile(50),
        p95: calcPercentile(95),
        p99: calcPercentile(99),
        average: len > 0 ? Math.round(latencyValues.reduce((a, b) => a + b, 0) / len) : 0,
      },
      tools: {
        totalCalls: totalToolCalls,
        topTools: topTools.slice(0, 20),
      },
      errors: {
        total: totalErrors,
        byType: errorTypes,
      },
      costs: {
        total: Math.round(totalCost * 10000) / 10000,
        byModel: costs,
      },
    };

    return result;
  },
};
