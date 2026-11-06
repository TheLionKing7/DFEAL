import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateIp(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

/**
 * Guard for user-supplied URLs (webhooks, MCP servers): HTTPS only and never
 * an internal / link-local address (prevents SSRF into the hosting network).
 */
export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "https:") throw new Error("URL must use https://");
  if (url.username || url.password) throw new Error("Credentials in URLs are not allowed — use the token field");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Internal hosts are not allowed");
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new Error("URL resolves to a private network address");
  }
  return url;
}

export async function safeFetch(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  await assertPublicHttpsUrl(url);
  const { timeoutMs = 15_000, ...rest } = init;
  return fetch(url, { ...rest, redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
}

export function urlHint(raw: string): string {
  try {
    const u = new URL(raw);
    const tail = u.pathname.length > 6 ? `…${u.pathname.slice(-4)}` : u.pathname;
    return `${u.host}${tail}`;
  } catch {
    return "configured";
  }
}
