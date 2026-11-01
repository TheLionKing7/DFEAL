import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");

for (const term of ["LOAD_BID_RESULT", "LOGIN\",", "login:", "/auth/access", "bids/search", "LOAD_BID_LIST"]) {
  let pos = 0;
  let n = 0;
  while (n < 3) {
    const i = js.indexOf(term, pos);
    if (i < 0) break;
    console.log(`\n=== ${term} ===`);
    console.log(js.slice(i, i + 500));
    pos = i + term.length;
    n++;
  }
}
