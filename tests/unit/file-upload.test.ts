import { describe, it, expect } from "vitest";
import {
  validateFile,
  fileToAttachment,
  getFileContentPreview,
  formatFileSize,
} from "@/lib/nova/file-upload";

describe("file-upload", () => {
  const makeFile = (name: string, type: string, size: number): File => {
    const file = new File(["x".repeat(size)], name, { type });
    return file;
  };

  describe("validateFile", () => {
    it("accepts valid small file", () => {
      const file = makeFile("test.pdf", "application/pdf", 1000);
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it("accepts valid image file", () => {
      const file = makeFile("photo.jpg", "image/jpeg", 1000);
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it("accepts valid text file", () => {
      const file = makeFile("doc.txt", "text/plain", 1000);
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it("accepts valid json file", () => {
      const file = makeFile("data.json", "application/json", 1000);
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it("accepts valid markdown file", () => {
      const file = makeFile("readme.md", "text/markdown", 1000);
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it("accepts valid csv file", () => {
      const file = makeFile("data.csv", "text/csv", 1000);
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it("rejects disallowed type", () => {
      const file = makeFile("test.exe", "application/x-executable", 100);
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not supported");
    });

    it("rejects empty type", () => {
      const file = makeFile("unknown", "", 100);
      const result = validateFile(file);
      expect(result.valid).toBe(false);
    });
  });

  describe("getFileContentPreview", () => {
    it("returns image preview for images", async () => {
      const preview = await getFileContentPreview({
        name: "photo.png",
        type: "image/png",
        size: 100,
        data: "abc",
      });
      expect(preview).toContain("Image");
      expect(preview).toContain("photo.png");
    });

    it("returns PDF preview for PDFs", async () => {
      const preview = await getFileContentPreview({
        name: "doc.pdf",
        type: "application/pdf",
        size: 100,
        data: "abc",
      });
      expect(preview).toContain("PDF");
    });

    it("returns generic file preview for other types", async () => {
      const preview = await getFileContentPreview({
        name: "data.bin",
        type: "application/octet-stream",
        size: 100,
        data: "abc",
      });
      expect(preview).toContain("File");
      expect(preview).toContain("data.bin");
    });
  });

  describe("formatFileSize", () => {
    it("formats bytes", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("formats kilobytes", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("formats megabytes", () => {
      expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
    });

    it("formats zero bytes", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });
  });
});
