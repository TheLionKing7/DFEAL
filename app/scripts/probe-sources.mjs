import * as cheerio from "cheerio";

async function probeSba() {
  const r = await fetch("https://www.sba.gov/events/find?page=0", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await r.text();
  const $ = cheerio.load(html);
  const links = [];
  $("h3 a, .event-card a, article a").each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();
    if (href && text) links.push({ href, text: text.slice(0, 100) });
  });
  console.log("SBA events links sample:", links.slice(0, 10));
  const scripts = html.match(/data-drupal-selector="views-view[^"]*"/g);
  console.log("drupal views:", scripts?.slice(0, 3));
}

async function probeStateUniv() {
  const r = await fetch("https://www.procure.stateuniv.state.il.us", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await r.text();
  const $ = cheerio.load(html);
  const hrefs = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href && /bid|search|proc|solic|open/i.test(href)) hrefs.push(href);
  });
  console.log("StateUniv links:", [...new Set(hrefs)].slice(0, 20));
}

async function probeStateUnivSearch() {
  const urls = [
    "https://www.procure.stateuniv.state.il.us/bso/view/search/external/advancedSearchBid.xhtml?openBids=true",
    "https://www.procure.stateuniv.state.il.us/bso/view/search/external/searchAdverts.xhtml?openBids=true",
  ];
  for (const url of urls) {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    console.log(url, r.status, (await r.text()).slice(0, 200));
  }
}

async function probeGrantsNih() {
  const body = {
    keyword: "research",
    agencies: "HHS-NIH11",
    oppStatuses: "posted|forecasted",
    rows: 2,
    startRecordNum: 0,
  };
  const r = await fetch("https://api.grants.gov/v1/api/search2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  console.log("NIH grants hits:", data.data?.hitCount, data.data?.oppHits?.length);
}

await probeSba();
await probeStateUniv();
await probeStateUnivSearch();
await probeGrantsNih();
