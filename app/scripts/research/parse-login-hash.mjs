import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
for (const term of ["rG({", "iG(", "Hashed:!0", "Hashed:!1", "hashed:!0", "hashed:!1"]) {
  let pos = 0;
  let n = 0;
  while (n < 3) {
    const i = js.indexOf(term, pos);
    if (i < 0) break;
    console.log(`\n--- ${term} ---`);
    console.log(js.slice(i - 100, i + 250));
    pos = i + term.length;
    n++;
  }
}
