import * as cheerio from "cheerio";
import { writeFileSync } from "fs";

const BASE = "https://www.procure.stateuniv.state.il.us";
const jar = new Map();

async function fetchWithJar(url, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("User-Agent", "Mozilla/5.0");
  if (jar.size) headers.set("Cookie", [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "));
  const res = await fetch(url, { ...init, headers });
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const part = raw.split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
  return res;
}

jar.clear();
const r = await fetchWithJar(`${BASE}/search.cfm?mName=findAdvancedSearch`);
const pubTok = cheerio.load(await r.text())('input[name="pubTok"]').attr("value") ?? "";

const body = new URLSearchParams();
body.set("mName", "processAdvancedSearch");
body.set("pubTok", pubTok);
body.set("searchTerm", "services");
body.append("noticeSearchStatus", "Published");
body.append("noticeType", "RFP");
body.append("procuringInstitution", "UIC");
body.set("submit", "Search");

const r2 = await fetchWithJar(`${BASE}/search.cfm`, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Referer: `${BASE}/search.cfm?mName=findAdvancedSearch`,
  },
  body: body.toString(),
});
const html = await r2.text();
writeFileSync("scripts/stateuniv-adv.html", html);
const $ = cheerio.load(html);
console.log("title", $("title").text(), "errors", $("#error-list").text().trim());
$("table tr").each((i, el) => {
  const t = $(el).text().replace(/\s+/g, " ").trim();
  if (t.length > 60) console.log("row", t.slice(0, 250));
});
$("a").each((_, el) => {
  const href = $(el).attr("href") ?? "";
  if (/detail|notice|proc/i.test(href) && !href.includes("findAdvanced")) {
    console.log("a", href, $(el).text().trim().slice(0, 60));
  }
});
