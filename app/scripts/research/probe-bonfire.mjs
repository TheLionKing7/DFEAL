import * as cheerio from "cheerio";

const url = "https://transitchicago.bonfirehub.com/opportunities";
const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
const html = await r.text();
const $ = cheerio.load(html);
console.log("tables", $("table").length);
$("table").each((ti, table) => {
  console.log("table", ti, "id", $(table).attr("id"), "rows", $(table).find("tr").length);
});
$("#openOpportunitiesTable tbody tr, #publicOpportunitiesTable tbody tr, table.dataTable tbody tr").each(
  (i, el) => {
    const cells = $(el)
      .find("td")
      .map((_, td) => $(td).text().trim())
      .get();
    const link = $(el).find("a").first().attr("href");
    if (cells.length) console.log(i, link, cells.join(" | ").slice(0, 200));
  },
);
