import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
const i = js.indexOf("auth:{");
console.log(js.slice(i, i + 500));

// Find bid search payload
const j = js.indexOf("postRequestWithAuthentication(_t.bids");
let pos = j;
for (let n = 0; n < 3; n++) {
  const k = js.indexOf("filters", pos);
  if (k < 0) break;
  console.log("\n--- filters ---");
  console.log(js.slice(k - 200, k + 500));
  pos = k + 100;
}

// search for commodity code matches filter in bids
for (const term of ["commodityCodeMatches", "BidStatus", "Active", "pageNumber", "pageSize", "stateFilter"]) {
  const x = js.indexOf(term);
  if (x >= 0) {
    console.log(`\n--- ${term} ---`);
    console.log(js.slice(x - 100, x + 300));
  }
}
