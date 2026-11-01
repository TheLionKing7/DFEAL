/** Load app/.env.local into process.env for CLI scripts (does not override existing vars). */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnvLocal(file = ".env.local") {
  const envPath = resolve(process.cwd(), file);
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const hash = value.indexOf(" #");
    if (hash > 0) value = value.slice(0, hash).trim();
    value = value.replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
