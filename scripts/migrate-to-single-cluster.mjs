import { execSync } from "child_process";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = resolve(__dirname, "..", "backup", "pre-migration");
const ENV_PATH = resolve(__dirname, "..", ".env.local");

function loadEnv() {
  const content = readFileSync(ENV_PATH, "utf-8");
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", maxBuffer: 50 * 1024 * 1024 });
}

async function main() {
  console.log("=== THETA PM — Single Cluster Migration ===\n");

  const env = loadEnv();
  const shards = [
    { name: "Shard 1", uri: env.MONGODB_URI_1 || env.MONGODB_URI },
    { name: "Shard 2", uri: env.MONGODB_URI_2 },
    { name: "Shard 3", uri: env.MONGODB_URI_3 },
  ];

  const targetUri = env.MONGODB_URI;
  if (!targetUri) {
    console.error("ERROR: MONGODB_URI is not set in .env.local");
    process.exit(1);
  }

  console.log(`Target cluster: ${maskUri(targetUri)}`);
  console.log(`Backup directory: ${BACKUP_DIR}\n`);

  // Step 1 — Dump each shard
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  for (const shard of shards) {
    if (!shard.uri) {
      console.warn(`WARN: No URI for ${shard.name}, skipping dump`);
      continue;
    }
    const shardDir = resolve(BACKUP_DIR, shard.name.replace(/\s/g, "_").toLowerCase());
    console.log(`--- Dumping ${shard.name} ---`);
    run(`mongodump --uri="${shard.uri}" --out="${shardDir}"`);
  }

  // Step 2 — Restore into target cluster
  console.log("\n--- Restoring into target cluster ---");
  const dumpDirs = ["shard_1", "shard_2", "shard_3"];
  for (const dir of dumpDirs) {
    const dumpPath = resolve(BACKUP_DIR, dir);
    if (!existsSync(dumpPath)) {
      console.warn(`WARN: No dump found at ${dumpPath}, skipping`);
      continue;
    }
    console.log(`Restoring ${dir}...`);
    run(`mongorestore --uri="${targetUri}" --dir="${dumpPath}"`);
  }

  // Step 3 — Verify counts
  console.log("\n=== Migration complete ===");
  console.log("Next steps:");
  console.log("  1. Verify document counts match expectations");
  console.log("  2. Update .env.local to keep only MONGODB_URI");
  console.log("  3. Remove MONGODB_URI_1 through MONGODB_URI_4");
  console.log("  4. Deploy the consolidated code");
  console.log("  5. Decommission old Atlas clusters after 30 days");
}

function maskUri(uri) {
  return uri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
