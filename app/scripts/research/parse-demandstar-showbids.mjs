import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");

for (const term of [
  'showBids:"',
  "showBids:",
  'bidStatus:"AC"',
  'bidStatus:"A',
  "commodityExists",
  "pageNumber",
  "recordsPerPage",
  "locationState",
  "stateCode",
  "a7({",
]) {
  let pos = 0;
  let n = 0;
  while (n < 8) {
    const i = js.indexOf(term, pos);
    if (i < 0) break;
    const ctx = js.slice(i, i + 250);
    if (term === "a7({" || ctx.includes("bidStatus") || ctx.includes("showBids")) {
      console.log(`\n--- ${term} @ ${i} ---`);
      console.log(ctx);
      n++;
    }
    pos = i + term.length;
  }
}
