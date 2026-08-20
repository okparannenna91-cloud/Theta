import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Must be the FIRST import of any script that needs .env.local values before
// modules like lib/prisma or lib/langraph initialize (ESM hoists imports).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const filePath = path.join(root, ".env.local");

if (!fs.existsSync(filePath)) {
  console.warn(`[env] No .env.local found at ${filePath} — using existing environment.`);
} else {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  let loaded = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
      loaded++;
    }
  }
  console.log(`[env] Loaded ${loaded} variables from .env.local`);
}