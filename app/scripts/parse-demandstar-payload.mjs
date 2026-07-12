import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");

// Find saga handling LOAD_BID_RESULT
const marker = "LOAD_BID_RESULT";
let pos = 0;
let found = 0;
while (found < 5) {
  const i = js.indexOf(marker, pos);
  if (i < 0) break;
  const chunk = js.slice(i, i + 800);
  if (chunk.includes("a7(") || chunk.includes("bids") || chunk.includes("filters")) {
    console.log(`\n=== @ ${i} ===`);
    console.log(chunk);
    found++;
  }
  pos = i + marker.length;
}

// Search for typical bid search payload keys together
for (const term of [
  "pageIndex",
  "bidStatus",
  "commodityCode",
  "locationFilter",
  "searchCriteria",
  "sortColumn",
  "memberId",
  "a7(",
]) {
  let p = 0;
  let c = 0;
  while (c < 2) {
    const i = js.indexOf(term, p);
    if (i < 0) break;
    const ctx = js.slice(i - 120, i + 400);
    if (/bid|search|filter|page/i.test(ctx)) {
      console.log(`\n--- ${term} @ ${i} ---`);
      console.log(ctx);
      c++;
    }
    p = i + term.length;
  }
}
