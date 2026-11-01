import * as cheerio from "cheerio";

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

async function search(term) {
  jar.clear();
  const r = await fetchWithJar(`${BASE}/search.cfm?mName=findAdvancedSearch`);
  const pubTok = cheerio.load(await r.text())('input[name="pubTok"]').attr("value") ?? "";
  const body = new URLSearchParams();
  body.set("mName", "processAdvancedSearch");
  body.set("pubTok", pubTok);
  body.set("searchTerm", term);
  body.append("noticeSearchStatus", "Published");
  body.append("noticeType", "RFP");
  body.append("noticeType", "RFI");
  body.append("noticeType", "Bid");
  const r2 = await fetchWithJar(`${BASE}/search.cfm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${BASE}/search.cfm?mName=findAdvancedSearch`,
    },
    body: body.toString(),
  });
  const html = await r2.text();
  const $ = cheerio.load(html);
  const errors = $("#error-list li").map((_, el) => $(el).text()).get();
  const rows = [];
  $("#Results table tr, .results-table tr, table tbody tr").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.length > 40) rows.push(t.slice(0, 200));
  });
  $("a[href*='noticeDetail']").slice(0, 5).each((_, el) => {
    rows.push("LINK " + $(el).attr("href") + " " + $(el).text().trim().slice(0, 60));
  });
  return { term, errors, rowCount: rows.length, sample: rows.slice(0, 8) };
}

for (const term of ["services", "consulting", "software", "health", "research"]) {
  const result = await search(term);
  console.log(result);
}
