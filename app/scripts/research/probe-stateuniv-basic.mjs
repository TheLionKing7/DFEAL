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

async function basicSearch(term) {
  jar.clear();
  const r = await fetchWithJar(`${BASE}/search.cfm?mName=findBasicSearch`);
  const pubTok = cheerio.load(await r.text())('input[name="pubTok"]').attr("value") ?? "";
  const body = new URLSearchParams();
  body.set("mName", "processBasicSearch");
  body.set("pubTok", pubTok);
  body.set("searchTerm", term);
  body.set("submit", "Search");
  const r2 = await fetchWithJar(`${BASE}/search.cfm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${BASE}/search.cfm?mName=findBasicSearch`,
    },
    body: body.toString(),
  });
  const $ = cheerio.load(await r2.text());
  const links = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (/noticeDetail|findNoticeDetail|noticeID/i.test(href)) {
      links.push({ href, text: $(el).text().trim().slice(0, 100) });
    }
  });
  const noResults = $.text().includes("No notices") || $.text().includes("no notices");
  return { term, links: links.length, noResults, sample: links.slice(0, 5) };
}

for (const term of ["2026", "RFP", "University", "equipment", "a"]) {
  console.log(await basicSearch(term));
}

// potential upcoming
jar.clear();
const r = await fetchWithJar(`${BASE}/npo.cfm`);
const $ = cheerio.load(await r.text());
console.log("npo title", $("title").text());
$("a[href*='notice']").slice(0, 8).each((_, el) => console.log($(el).attr("href"), $(el).text().trim().slice(0, 80)));
