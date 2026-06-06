import { encrypt, decrypt } from "./crypto";

const SENSITIVE_FIELDS = new Set([
  "billingLog.metadata",
  "formResponse.data",
  "user.email",
  "user.name",
]);

function isSensitive(model: string, field: string): boolean {
  return SENSITIVE_FIELDS.has(`${model}.${field}`);
}

export function encryptJson<T>(model: string, data: T): T {
  if (!data || typeof data !== "object") return data;
  const cloned = { ...data } as any;
  for (const key of Object.keys(cloned)) {
    if (isSensitive(model, key)) {
      try {
        cloned[key] = encrypt(JSON.stringify(cloned[key]));
      } catch {
        cloned[key] = cloned[key];
      }
    }
  }
  return cloned as T;
}

export function decryptJson<T>(model: string, data: T): T {
  if (!data || typeof data !== "object") return data;
  const cloned = { ...data } as any;
  for (const key of Object.keys(cloned)) {
    if (isSensitive(model, key)) {
      if (typeof cloned[key] === "string" && cloned[key].includes(":")) {
        try {
          cloned[key] = JSON.parse(decrypt(cloned[key]));
        } catch {
          cloned[key] = cloned[key];
        }
      }
    }
  }
  return cloned as T;
}

export function encryptSensitiveFields(model: string, data: Record<string, any>): Record<string, any> {
  const result = { ...data };
  if (model === "billingLog" && result.metadata) {
    try {
      result.metadata = encrypt(JSON.stringify(result.metadata));
    } catch {}
  }
  if (model === "formResponse" && result.data) {
    try {
      result.data = encrypt(JSON.stringify(result.data));
    } catch {}
  }
  return result;
}

export function decryptSensitiveFields(model: string, data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) return data.map((item) => decryptSensitiveFields(model, item));
  if (typeof data !== "object") return data;
  const result = { ...data };
  if (model === "billingLog" && result.metadata && typeof result.metadata === "string") {
    try {
      result.metadata = JSON.parse(decrypt(result.metadata));
    } catch {}
  }
  if (model === "formResponse" && result.data && typeof result.data === "string") {
    try {
      result.data = JSON.parse(decrypt(result.data));
    } catch {}
  }
  return result;
}
