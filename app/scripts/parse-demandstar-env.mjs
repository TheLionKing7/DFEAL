import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");

// Extract jn.api or env config object
const envKeys = [
  "REACT_APP_API_AUTHURL",
  "REACT_APP_API_CONTRACTURL",
  "REACT_APP_API_URL",
  "REACT_APP_API_USERURL",
  "REACT_APP_DS_ENV",
  "REACT_APP_API_BASE_URL",
];

for (const k of envKeys) {
  const idx = js.indexOf(k);
  if (idx >= 0) console.log(k, "...", js.slice(idx, idx + 200));
}

// Find _t object routes (bid search)
for (const term of ["getBids", "BidSearch", "searchBids", "login", "authenticate", "contracts/"]) {
  let pos = 0;
  let n = 0;
  while (n < 5) {
    const i = js.indexOf(term, pos);
    if (i < 0) break;
    console.log("\n---", term, "---");
    console.log(js.slice(Math.max(0, i - 80), i + 120));
    pos = i + term.length;
    n++;
  }
}
