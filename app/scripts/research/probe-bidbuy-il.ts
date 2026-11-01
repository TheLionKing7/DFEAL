import * as cheerio from "cheerio";
import { sledFetch, warmCookieJar } from "../src/lib/sled/http";

const OPEN_BIDS =
  "https://www.bidbuy.illinois.gov/bso/view/search/external/advancedSearchBid.xhtml?openBids=true";

async function main() {
  const jar = new Map<string, string>();
  await warmCookieJar("https://www.bidbuy.illinois.gov/bso/", jar);
  const res = await sledFetch(OPEN_BIDS, { cookieJar: jar });
  const html = await res.text();
  const $ = cheerio.load(html);
  const viewState = $('input[name="javax.faces.ViewState"]').attr("value") ?? "";
  const csrf = $("#bidSearchResultsForm input[name='_csrf']").attr("value") ?? "";

  const body = new URLSearchParams();
  body.set("javax.faces.partial.ajax", "true");
  body.set("javax.faces.source", "bidSearchResultsForm:bidResultId");
  body.set("javax.faces.partial.execute", "bidSearchResultsForm:bidResultId");
  body.set("javax.faces.partial.render", "bidSearchResultsForm:bidResultId");
  body.set("bidSearchResultsForm:bidResultId", "bidSearchResultsForm:bidResultId");
  body.set("bidSearchResultsForm:bidResultId_pagination", "true");
  body.set("bidSearchResultsForm:bidResultId_first", "25");
  body.set("bidSearchResultsForm:bidResultId_rows", "25");
  body.set("bidSearchResultsForm:bidResultId_skipChildren", "true");
  body.set("bidSearchResultsForm:bidResultId_encodeFeature", "true");
  body.set("bidSearchResultsForm", "bidSearchResultsForm");
  body.set("_csrf", csrf);
  body.set("javax.faces.ViewState", viewState);

  const ajax = await sledFetch(OPEN_BIDS, {
    method: "POST",
    cookieJar: jar,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Faces-Request": "partial/ajax",
      "X-Requested-With": "XMLHttpRequest",
      Referer: OPEN_BIDS,
    },
    body: body.toString(),
  });
  const cdata = (await ajax.text()).match(/<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ?? "";
  const $2 = cheerio.load(`<table><tbody>${cdata}</tbody></table>`);
  const first = $2("tr").first();
  console.log("cells", first.find("td").length);
  first.find("td").each((i, td) => console.log(i, $2(td).text().trim().slice(0, 50)));
}

main().catch(console.error);
