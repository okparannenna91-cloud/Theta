import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ThetaMCPServer } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";

// MCP HTTP/SSE endpoint — allows Claude Desktop, ChatGPT, Cursor, Windsurf to connect
// Protocol: JSON-RPC 2.0 over HTTP POST (request/response) or SSE (streaming)

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || "";

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    // Verify workspace access
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: user.id, status: "active" },
    });
    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();

    // Handle JSON-RPC 2.0 request
    const server = new ThetaMCPServer(workspaceId);
    const response = await server.handleRequest(body);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("MCP API error:", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: error.message || "Internal server error" },
        id: null,
      },
      { status: 200 } // JSON-RPC errors are always 200
    );
  }
}

// SSE endpoint for MCP streaming (used by some clients)
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || "";

    if (!workspaceId) {
      return new Response("workspaceId is required", { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send endpoint info as first SSE event
        const info = {
          jsonrpc: "2.0",
          result: {
            name: "theta-mcp",
            version: "1.0.0",
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
            },
          },
        };
        controller.enqueue(encoder.encode(`event: endpoint\ndata: ${JSON.stringify(info)}\n\n`));

        // Keep alive with periodic pings
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
          } catch {
            clearInterval(keepAlive);
          }
        }, 30000);

        // Close on client disconnect
        req.signal?.addEventListener("abort", () => {
          clearInterval(keepAlive);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response("Internal server error", { status: 500 });
  }
}
