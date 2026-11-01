import * as cheerio from "cheerio";

async function probeEvent(id) {
  const r = await fetch(`https://www.sba.gov/event/${id}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await r.text();
  const $ = cheerio.load(html);
  console.log("title", $("h1").first().text().trim());
  console.log("meta", $(".field--name-field-event-date").text().trim().slice(0, 120));
  console.log("body", $(".field--name-body, .event-description").text().trim().slice(0, 200));
}

await probeEvent("84235");
