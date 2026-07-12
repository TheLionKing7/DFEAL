import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");

function findContext(needle, before = 200, after = 300) {
  let pos = 0;
  let n = 0;
  while (n < 8) {
    const i = js.indexOf(needle, pos);
    if (i < 0) break;
    console.log(`\n=== ${needle} @ ${i} ===`);
    console.log(js.slice(Math.max(0, i - before), i + after));
    pos = i + needle.length;
    n++;
  }
}

findContext("function RZ", 50, 400);
findContext("getBidsSearch", 100, 400);
findContext("auth/access", 100, 200);
findContext("LOGIN", 50, 200);
findContext("_t={", 0, 2000);
findContext("searchBids", 100, 400);
findContext("BidSearch:", 50, 300);
