import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
for (const term of ["suppliers/bids", "bidDetails", "bidId}/", "/bids/"]) {
  let pos = 0;
  let n = 0;
  while (n < 3) {
    const i = js.indexOf(term, pos);
    if (i < 0) break;
    console.log(`\n--- ${term} ---`);
    console.log(js.slice(i - 60, i + 120));
    pos = i + term.length;
    n++;
  }
}
