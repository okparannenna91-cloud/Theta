import { describe, it, expect, afterEach } from "vitest";
import {
  convertMessagesToPrompt,
  createOpenAICompletion,
  extractBridgeIdentity,
  extractConfirmationFromResult,
  extractRequestedWorkspace,
  isApprovalMessage,
  isDenialMessage,
  toOpenAIStream,
  validateBridgeSecret,
  type BridgeMessage,
} from "@/lib/nova/bridge";

const originalSecret = process.env.FLOW_BRIDGE_SECRET;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.FLOW_BRIDGE_SECRET;
  } else {
    process.env.FLOW_BRIDGE_SECRET = originalSecret;
  }
});

function bridgeMessages(turns: Array<{ role: "user" | "assistant"; content: string }>): BridgeMessage[] {
  return turns.map((t) => ({ role: t.role, content: t.content }));
}

describe("Flow³ Bridge", () => {
  describe("convertMessagesToPrompt", () => {
    it("uses the last user turn as the prompt", () => {
      const { prompt } = convertMessagesToPrompt(
        bridgeMessages([
          { role: "user", content: "List my tasks." },
          { role: "assistant", content: "Here are your tasks." },
          { role: "user", content: "Create a task to ship v2." },
        ])
      );
      expect(prompt).toBe("Create a task to ship v2.");
    });

    it("flattens earlier turns into a plain-text history", () => {
      const { history } = convertMessagesToPrompt(
        bridgeMessages([
          { role: "user", content: "List my tasks." },
          { role: "assistant", content: "Here are your tasks." },
          { role: "user", content: "Create a task to ship v2." },
        ])
      );
      expect(history).toContain("User: List my tasks.");
      expect(history).toContain("Assistant: Here are your tasks.");
    });

    it("handles array content parts (OpenAI format)", () => {
      const { prompt } = convertMessagesToPrompt([
        { role: "user", content: [{ type: "text", text: "Hello" }, { type: "text", text: " world" }] },
      ]);
      expect(prompt).toBe("Hello world");
    });

    it("returns an empty prompt when the last turn is not a user turn", () => {
      const { prompt, history } = convertMessagesToPrompt([{ role: "assistant", content: "Hi" }]);
      expect(prompt).toBe("");
      expect(history).toBe("Assistant: Hi");
    });

    it("returns an empty prompt and history when there are no turns", () => {
      const { prompt, history } = convertMessagesToPrompt([]);
      expect(prompt).toBe("");
      expect(history).toBe("");
    });
  });

  describe("validateBridgeSecret", () => {
    it("accepts the correct bearer secret", () => {
      process.env.FLOW_BRIDGE_SECRET = "super-secret";
      const req = new Request("http://localhost/api/flow/chat", {
        headers: { authorization: "Bearer super-secret" },
      });
      expect(validateBridgeSecret(req)).toBe(true);
    });

    it("rejects a wrong secret", () => {
      process.env.FLOW_BRIDGE_SECRET = "super-secret";
      const req = new Request("http://localhost/api/flow/chat", {
        headers: { authorization: "Bearer wrong" },
      });
      expect(validateBridgeSecret(req)).toBe(false);
    });

    it("rejects requests without credentials", () => {
      process.env.FLOW_BRIDGE_SECRET = "super-secret";
      expect(validateBridgeSecret(new Request("http://localhost/api/flow/chat"))).toBe(false);
    });

    it("rejects when the secret is not configured", () => {
      delete process.env.FLOW_BRIDGE_SECRET;
      const req = new Request("http://localhost/api/flow/chat", {
        headers: { authorization: "Bearer anything" },
      });
      expect(validateBridgeSecret(req)).toBe(false);
    });
  });

  describe("extractBridgeIdentity", () => {
    it("reads the X-Flow-User header", () => {
      const req = new Request("http://localhost", { headers: { "x-flow-user": "Amelia@ThetaPM.com" } });
      expect(extractBridgeIdentity(req, {})).toEqual({ email: "amelia@thetapm.com" });
    });

    it("reads the body user field (addUser)", () => {
      const req = new Request("http://localhost");
      expect(extractBridgeIdentity(req, { user: "Amelia@ThetaPM.com" })).toEqual({ email: "amelia@thetapm.com" });
    });

    it("returns null when no identity is present", () => {
      const req = new Request("http://localhost");
      expect(extractBridgeIdentity(req, {})).toBeNull();
    });
  });

  describe("extractRequestedWorkspace", () => {
    it("prefers the header over the body", () => {
      const req = new Request("http://localhost", { headers: { "x-flow-workspace": "ws-header" } });
      expect(extractRequestedWorkspace(req, { workspaceId: "ws-body" })).toBe("ws-header");
    });

    it("reads the body workspaceId", () => {
      expect(extractRequestedWorkspace(new Request("http://localhost"), { workspaceId: "ws-body" })).toBe("ws-body");
    });

    it("returns null when absent", () => {
      expect(extractRequestedWorkspace(new Request("http://localhost"), {})).toBeNull();
    });
  });

  describe("extractConfirmationFromResult", () => {
    it("detects a confirmation_required tool result", () => {
      const result = extractConfirmationFromResult([
        { toolName: "create_task", result: { status: "confirmation_required", reason: "Creating data", args: { title: "x" } } },
      ]);
      expect(result).toEqual({ toolName: "create_task", reason: "Creating data", args: { title: "x" } });
    });

    it("returns null when no tool requested confirmation", () => {
      const result = extractConfirmationFromResult([{ toolName: "get_tasks", result: { tasks: [] } }]);
      expect(result).toBeNull();
    });
  });

  describe("approval/denial detection", () => {
    it("recognizes approvals", () => {
      expect(isApprovalMessage("Approve")).toBe(true);
      expect(isApprovalMessage("yes, go ahead and do it")).toBe(true);
      expect(isApprovalMessage("proceed")).toBe(true);
      expect(isApprovalMessage("What else can you do?")).toBe(false);
    });

    it("recognizes denials", () => {
      expect(isDenialMessage("Cancel")).toBe(true);
      expect(isDenialMessage("No thanks")).toBe(true);
      expect(isDenialMessage("tell me more first")).toBe(false);
    });
  });

  describe("createOpenAICompletion", () => {
    const base = { response: "Done.", route: "CHAT", provider: "gemini", model: "flow-3", toolResults: [], durationMs: 1 };

    it("returns a plain completion without confirmation", () => {
      const completion = createOpenAICompletion({ result: base, model: "flow-3" });
      expect(completion.choices[0].message.content).toBe("Done.");
      expect(completion.choices[0].finish_reason).toBe("stop");
      expect((completion.choices[0].message as { tool_calls?: unknown }).tool_calls).toBeUndefined();
    });

    it("emits a flow_confirm tool_call when confirmation is pending", () => {
      const completion = createOpenAICompletion({
        result: base,
        model: "flow-3",
        confirmation: { token: "tok1234567890", reason: "Create data", toolName: "create_task", args: { title: "x" } },
      });
      const message = completion.choices[0].message as {
        tool_calls: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
      };
      expect(completion.choices[0].finish_reason).toBe("tool_calls");
      expect(message.tool_calls[0].function.name).toBe("flow_confirm");
      const parsed = JSON.parse(message.tool_calls[0].function.arguments);
      expect(parsed.token).toBe("tok1234567890");
      expect(parsed.tool).toBe("create_task");
    });
  });

  describe("toOpenAIStream", () => {
    async function collect(stream: ReadableStream<Uint8Array>): Promise<string> {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
      return text;
    }

    it("streams content chunks and terminates with [DONE]", async () => {
      const result = {
        response: "Here is a short answer for you now.",
        route: "CHAT",
        provider: "gemini",
        model: "flow-3",
        toolResults: [] as Array<{ toolName: string }>,
        durationMs: 1,
      };
      const text = await collect(toOpenAIStream({ result, model: "flow-3", conversationId: "conv-1" }));
      expect(text).toContain('"role":"assistant"');
      expect(text).toContain("Here is a short");
      expect(text).toContain("data: [DONE]");
      expect(text).toContain('"finish_reason":"stop"');
    });

    it("emits a tool_calls delta when confirmation is pending", async () => {
      const result = {
        response: "Please confirm.",
        route: "CHAT",
        provider: "gemini",
        model: "flow-3",
        toolResults: [] as Array<{ toolName: string }>,
        durationMs: 1,
      };
      const text = await collect(
        toOpenAIStream({
          result,
          model: "flow-3",
          conversationId: "conv-1",
          confirmation: { token: "tok1234567890", reason: "Create data", toolName: "create_task", args: {} },
        })
      );
      expect(text).toContain('"name":"flow_confirm"');
      expect(text).toContain('"finish_reason":"tool_calls"');
      expect(text).toContain("data: [DONE]");
    });
  });
});