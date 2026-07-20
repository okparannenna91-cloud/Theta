import { ThetaMCPServer, JSONRPCRequest, JSONRPCResponse } from "./server";
import { logger } from "@/lib/logger";

/**
 * Stdio transport for the Theta MCP server.
 *
 * Reads JSON-RPC 2.0 messages from stdin (newline-delimited) and writes
 * responses to stdout. Suitable for direct integration with Claude Desktop,
 * Cursor, Windsurf, and other MCP-compatible hosts.
 *
 * Usage:
 *   THETA_WORKSPACE_ID=<id> npx tsx lib/mcp/stdio-transport.ts
 *
 * Each line on stdin must be a valid JSON-RPC 2.0 request object.
 * Each line on stdout is a JSON-RPC 2.0 response object.
 */

function parseJSONRPC(line: string): JSONRPCRequest | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null) return null;
    if (parsed.jsonrpc !== "2.0" || typeof parsed.method !== "string") return null;
    return parsed as JSONRPCRequest;
  } catch {
    return null;
  }
}

function writeResponse(response: JSONRPCResponse): void {
  const line = JSON.stringify(response);
  process.stdout.write(line + "\n");
}

function writeErrorResponse(
  id: string | number | null | undefined,
  code: number,
  message: string,
): void {
  writeResponse({
    jsonrpc: "2.0",
    error: { code, message },
    id: id ?? undefined,
  });
}

async function main(): Promise<void> {
  const workspaceId = process.env.THETA_WORKSPACE_ID;
  if (!workspaceId) {
    logger.error("THETA_WORKSPACE_ID environment variable is required");
    process.stderr.write(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "THETA_WORKSPACE_ID environment variable is required" },
        id: null,
      }) + "\n",
    );
    process.exit(1);
  }

  const server = new ThetaMCPServer(workspaceId);

  logger.info(`Theta MCP server starting (workspace: ${workspaceId})`);

  let buffer = "";

  process.stdin.setEncoding("utf-8");
  process.stdin.resume();

  process.stdin.on("data", async (chunk: Buffer | string) => {
    buffer += typeof chunk === "string" ? chunk : chunk.toString("utf-8");

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const request = parseJSONRPC(line);
      if (!request) {
        if (line.trim()) {
          writeErrorResponse(null, -32700, "Parse error");
        }
        continue;
      }

      try {
        const response = await server.handleRequest(request);
        writeResponse(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Unhandled error in MCP handler:`, message);
        writeErrorResponse(request.id ?? null, -32603, message);
      }
    }
  });

  process.stdin.on("end", () => {
    logger.info("Theta MCP server: stdin closed, shutting down");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    logger.info("Theta MCP server: SIGINT received, shutting down");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.info("Theta MCP server: SIGTERM received, shutting down");
    process.exit(0);
  });

  process.on("uncaughtException", (err) => {
    logger.error("Theta MCP server: uncaught exception:", err.message);
    writeErrorResponse(null, -32603, "Internal error");
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Theta MCP server: unhandled rejection:", String(reason));
  });
}

main();
