import * as cheerio from "cheerio";

const BASE = "https://www.procure.stateuniv.state.il.us";

async function probe(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await r.text();
  const $ = cheerio.load(html);
  console.log("\n===", url, r.status, "len", html.length);
  $("table tr").slice(0, 5).each((i, el) => {
    console.log("row", i, $(el).text().replace(/\s+/g, " ").trim().slice(0, 150));
  });
  $("a[href*='bid'], a[href*='solic'], a[href*='detail']").slice(0, 8).each((_, el) => {
    console.log("a", $(el).attr("href"), $(el).text().trim().slice(0, 60));
  });
}

await probe(`${BASE}/search.cfm?mName=findAdvancedSearch`);
await probe(`${BASE}/search.cfm`);
await probe(`${BASE}/ebid.cfm?mName=findEbidWorklist`);
