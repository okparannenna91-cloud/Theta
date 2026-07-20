const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  data: string; // base64 or URL
  isUrl?: boolean;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `File type "${file.type}" is not supported.` };
  }
  return { valid: true };
}

export async function fileToAttachment(file: File): Promise<FileAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64,
      });
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function decodeBase64(base64: string): Buffer {
  return Buffer.from(base64, "base64");
}

async function extractPdfText(base64: string): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse");
    const pdfFn = (pdfParse as any).default || pdfParse;
    const buffer = decodeBase64(base64);
    const result = await pdfFn(buffer);
    const text = result.text?.trim();
    if (text && text.length > 0) {
      return text.substring(0, 8000);
    }
    return "[PDF: no extractable text found]";
  } catch (error: any) {
    return `[PDF extraction failed: ${error.message}]`;
  }
}

async function extractDocxText(base64: string): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const buffer = decodeBase64(base64);
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim();
    if (text && text.length > 0) {
      return text.substring(0, 8000);
    }
    return "[DOCX: no extractable text found]";
  } catch (error: any) {
    return `[DOCX extraction failed: ${error.message}]`;
  }
}

function extractPlainText(base64: string): string {
  try {
    const buffer = decodeBase64(base64);
    const text = buffer.toString("utf-8").trim();
    return text.substring(0, 8000);
  } catch {
    return "[Could not decode text file]";
  }
}

export async function getFileContentPreview(attachment: FileAttachment): Promise<string> {
  if (attachment.type.startsWith("image/")) {
    return `[Image: ${attachment.name}]`;
  }
  if (attachment.type === "application/pdf") {
    return await extractPdfText(attachment.data);
  }
  if (attachment.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return await extractDocxText(attachment.data);
  }
  if (attachment.type.startsWith("text/") || attachment.type === "application/json") {
    return extractPlainText(attachment.data);
  }
  return `[File: ${attachment.name}]`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
