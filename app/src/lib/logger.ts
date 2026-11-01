/**
 * Minimal structured logger. Emits one JSON line per event so Vercel / any log
 * drain can filter by `event`. Never pass secrets or full request bodies.
 */
type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[(process.env.LOG_LEVEL as Level) ?? "info"] ?? LEVELS.info;

function emit(level: Level, event: string, fields: Fields) {
  if (LEVELS[level] < threshold) return;
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, fields: Fields = {}) => emit("debug", event, fields),
  info: (event: string, fields: Fields = {}) => emit("info", event, fields),
  warn: (event: string, fields: Fields = {}) => emit("warn", event, fields),
  error: (event: string, fields: Fields = {}) => emit("error", event, fields),
};

export function errorMessage(error: unknown, fallback = "Unexpected error"): string {
  return error instanceof Error ? error.message : fallback;
}
