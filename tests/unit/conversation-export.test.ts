import { describe, it, expect } from "vitest";
import { exportConversation, downloadExport } from "@/components/ai/nova/conversation-export";
import type { Message } from "@/components/ai/nova/types";

describe("conversation-export", () => {
  const makeMessage = (overrides: Partial<Message> = {}): Message => ({
    role: "nova",
    content: "Hello world",
    timestamp: new Date("2025-01-15T10:30:00"),
    ...overrides,
  });

  describe("exportConversation", () => {
    it("exports a simple conversation", () => {
      const messages = [
        makeMessage({ role: "user", content: "Hi Nova" }),
        makeMessage({ role: "nova", content: "Hey! What do you need?" }),
      ];

      const result = exportConversation(messages);

      expect(result).toContain("# Nova Conversation");
      expect(result).toContain("**You**");
      expect(result).toContain("Hi Nova");
      expect(result).toContain("**Nova**");
      expect(result).toContain("Hey! What do you need?");
    });

    it("uses custom title", () => {
      const messages = [makeMessage()];
      const result = exportConversation(messages, "My Chat");
      expect(result).toContain("# My Chat");
    });

    it("includes timestamps", () => {
      const messages = [makeMessage({ timestamp: new Date("2025-01-15T10:30:00") })];
      const result = exportConversation(messages);
      expect(result).toContain("10:30");
    });

    it("includes attachments", () => {
      const messages = [
        makeMessage({
          role: "user",
          content: "Check this file",
          attachments: [{ name: "doc.pdf", type: "application/pdf", url: "" }],
        }),
      ];
      const result = exportConversation(messages);
      expect(result).toContain("Attachments: doc.pdf");
    });

    it("handles empty conversation", () => {
      const result = exportConversation([]);
      expect(result).toContain("# Nova Conversation");
      expect(result).toContain("Exported on");
    });

    it("handles multiple attachments", () => {
      const messages = [
        makeMessage({
          role: "user",
          content: "Files",
          attachments: [
            { name: "a.pdf", type: "application/pdf", url: "" },
            { name: "b.docx", type: "word/docx", url: "" },
          ],
        }),
      ];
      const result = exportConversation(messages);
      expect(result).toContain("Attachments: a.pdf, b.docx");
    });
  });

  describe("downloadExport", () => {
    it("returns correct blob and filename", () => {
      const content = "# Test export";
      const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe("text/markdown;charset=utf-8");
    });
  });
});
