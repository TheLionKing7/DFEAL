import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "crypto";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const hash = value.indexOf(" #");
    if (hash > 0) value = value.slice(0, hash).trim();
    process.env[key] = value;
  }
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BASES = [
  "https://api.demandstar.com/contract/api",
  "https://api.demandstar.com/contracts/v1",
  "https://api.demandstar.com/contents/content/v1",
  "https://api.demandstar.com",
];

async function debug() {
  loadEnvLocal();
  const user = process.env.DEMANDSTAR_USERNAME!.trim();
  const pass = process.env.DEMANDSTAR_PASSWORD!.trim();
  const hashed = createHash("md5").update(`${user.toUpperCase()}${pass}`).digest("hex");

  const loginRes = await fetch("https://api.demandstar.com/auth/access/v1/auth/gettoken", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA },
    body: JSON.stringify({ Expiration: 24, IsAnonymous: false, Password: hashed, UserName: user, Hashed: true }),
  });
  const loginJson = (await loginRes.json()) as { token?: string };
  const token = loginJson.token;
  if (!token) {
    console.log("no token");
    return;
  }

  const body = {
    showBids: "",
    bidStatus: "AC",
    sortBy: "broadCastDate",
    sortOrder: "DESC",
    bidscurrentPage: 1,
    commodityExists: false,
    initialRequest: true,
    preserveFilters: false,
  };

  for (const base of BASES) {
    for (const path of ["/bids/search", "bids/search"]) {
      const url = `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "User-Agent": UA,
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      console.log(res.status, url, "len", text.length, text.slice(0, 120));
    }
  }
}

debug().catch(console.error);
