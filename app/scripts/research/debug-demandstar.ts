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

async function debug() {
  loadEnvLocal();
  const user = process.env.DEMANDSTAR_USERNAME!.trim();
  const pass = process.env.DEMANDSTAR_PASSWORD!.trim();
  const hashed = createHash("md5").update(`${user.toUpperCase()}${pass}`).digest("hex");

  const loginRes = await fetch("https://api.demandstar.com/auth/access/v1/auth/gettoken", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA },
    body: JSON.stringify({
      Expiration: 24,
      IsAnonymous: false,
      Password: hashed,
      UserName: user,
      Hashed: true,
    }),
  });
  const loginText = await loginRes.text();
  console.log("LOGIN", loginRes.status, loginText.slice(0, 500));

  let token: string | undefined;
  try {
    const loginJson = JSON.parse(loginText) as { token?: string; errorMessage?: string; hasError?: boolean };
    token = loginJson.token;
    console.log("LOGIN parsed", { hasToken: Boolean(token), errorMessage: loginJson.errorMessage, hasError: loginJson.hasError });
  } catch {
    console.log("LOGIN JSON parse failed");
    return;
  }

  if (!token) return;

  const body = {
    showBids: "",
    filterOrdered: false,
    location: "",
    locationText: "",
    locationType: "",
    radius: "",
    industry: "",
    states: "",
    stateText: "",
    bidStatus: "AC",
    bidIdentifier: "",
    fiscalYear: "",
    bidName: "",
    agencyMemberId: "",
    agencyText: "",
    dueDateTime: "",
    startDueDate: "",
    endDueDate: "",
    myBids: false,
    includeExternalBids: false,
    bidsNotified: false,
    orderedBids: false,
    watchedBids: false,
    commodityMatches: false,
    ebiddingAvailable: false,
    sortBy: "broadCastDate",
    sortOrder: "DESC",
    bidscurrentPage: 1,
    commodityExists: false,
    initialRequest: true,
    preserveFilters: false,
  };

  const searchRes = await fetch("https://api.demandstar.com/contents/content/v1/bids/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": UA,
    },
    body: JSON.stringify(body),
  });
  const searchText = await searchRes.text();
  console.log("SEARCH", searchRes.status, "len", searchText.length);
  console.log(searchText.slice(0, 800));
}

debug().catch(console.error);
