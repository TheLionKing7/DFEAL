/**
 * Probe DemandStar / Euna OpenBids login and bid search endpoints.
 * Usage: node scripts/probe-demandstar.mjs
 * With creds: DEMANDSTAR_USERNAME=... DEMANDSTAR_PASSWORD=... node scripts/probe-demandstar.mjs
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const jar = new Map();

async function sledFetch(url, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("User-Agent", UA);
  if (jar.size) headers.set("Cookie", [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "));
  const res = await fetch(url, { ...init, headers, redirect: "manual" });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookie) {
    const part = raw.split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
  return res;
}

async function probeUrls() {
  const urls = [
    "https://network.demandstar.com/",
    "https://www.demandstar.com/",
    "https://www.demandstar.com/app/login",
    "https://www.demandstar.com/app/",
    "https://network.demandstar.com/login",
  ];
  for (const url of urls) {
    try {
      const r = await sledFetch(url);
      const loc = r.headers.get("location");
      const text = r.status < 400 ? (await r.text()).slice(0, 500) : "";
      console.log(url, "->", r.status, loc ?? "", text.match(/<title>([^<]+)/i)?.[1] ?? "");
    } catch (e) {
      console.log(url, "ERR", e.message);
    }
  }
}

async function probeAppAssets() {
  try {
    const r = await sledFetch("https://www.demandstar.com/app/login", { redirect: "follow" });
    const html = await r.text();
    console.log("\n/app/login status", r.status, "len", html.length);
    console.log("title", html.match(/<title>([^<]+)/i)?.[1] ?? "(none)");
    const scripts = [...html.matchAll(/src=[\"']([^\"']+\.js)[\"']/gi)].map((m) => m[1]);
    console.log("scripts", scripts.slice(0, 15));
    const apis = [...html.matchAll(/https?:\/\/[^\"'\s]+/gi)]
      .map((m) => m[0])
      .filter((u) => /api|graphql|auth|bid|euna/i.test(u));
    console.log("api-like", [...new Set(apis)].slice(0, 25));
    if (scripts[0]) {
      const jsUrl = scripts[0].startsWith("http") ? scripts[0] : `https://www.demandstar.com${scripts[0]}`;
      const jr = await sledFetch(jsUrl);
      const js = (await jr.text()).slice(0, 50000);
      const endpoints = [...js.matchAll(/[\"'](\/api[^\"']+)[\"']/gi)].map((m) => m[1]);
      console.log("js api paths", [...new Set(endpoints)].slice(0, 30));
    }
  } catch (e) {
    console.log("\n/app/login probe failed:", e.message);
  }
}

async function probeJsBundle() {
  try {
    const r = await sledFetch("https://www.demandstar.com/app/static/js/main.bf85514a.js");
    const js = await r.text();
    console.log("\nmain.js len", js.length);
    const apiPaths = [...js.matchAll(/["'](\/api\/[^"']+)["']/g)].map((m) => m[1]);
    console.log("api paths", [...new Set(apiPaths)].slice(0, 60));
    const baseUrls = [...js.matchAll(/https:\/\/[a-z0-9.-]+\.(?:demandstar|eunasolutions)\.[a-z.]+/gi)].map(
      (m) => m[0],
    );
    console.log("base urls", [...new Set(baseUrls)].slice(0, 20));
    const bidPaths = [...js.matchAll(/["']([^"']*bid[^"']*)["']/gi)]
      .map((m) => m[1])
      .filter((s) => s.length < 80 && /search|list|query|fetch/i.test(s));
    console.log("bid paths", [...new Set(bidPaths)].slice(0, 40));
  } catch (e) {
    console.log("js probe failed:", e.message);
  }
}

async function tryLogin() {
  const user = process.env.DEMANDSTAR_USERNAME?.trim();
  const pass = process.env.DEMANDSTAR_PASSWORD?.trim();
  if (!user || !pass) {
    console.log("\nNo DEMANDSTAR_USERNAME/PASSWORD — skipping login probe");
    return;
  }

  const loginCandidates = [
    { url: "https://www.demandstar.com/api/auth/login", body: { username: user, password: pass } },
    { url: "https://www.demandstar.com/api/login", body: { username: user, password: pass } },
    { url: "https://www.demandstar.com/api/login", body: { email: user, password: pass } },
    { url: "https://www.demandstar.com/app/api/login", body: { username: user, password: pass } },
  ];

  for (const c of loginCandidates) {
    try {
      const r = await sledFetch(c.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(c.body),
      });
      const text = await r.text();
      console.log("\nLogin try", c.url, r.status, text.slice(0, 300));
    } catch (e) {
      console.log("Login try", c.url, "ERR", e.message);
    }
  }
}

await probeUrls();
await probeAppAssets();
await probeJsBundle();
await tryLogin();
console.log("\nCookies:", [...jar.keys()]);
