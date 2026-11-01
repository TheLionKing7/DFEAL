import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");

for (const term of ["statusType:\"AC\"", "statusName:\"Active\"", "Active\"", "dV(Ue", "initialRequest:!0", "bidscurrentPage", "pageSize:", "recordsPerPage"]) {
  let pos = 0;
  let n = 0;
  while (n < 4) {
    const i = js.indexOf(term, pos);
    if (i < 0) break;
    console.log(`\n--- ${term} @ ${i} ---`);
    console.log(js.slice(i - 80, i + 350));
    pos = i + term.length;
    n++;
  }
}

// find LOAD_BID saga calling a7 with filters
const saga = js.indexOf("function d7(");
console.log("\nnot d7");

// Search for postRequestWithAuthentication(_t.bids with surrounding saga
let idx = 0;
let count = 0;
while (count < 5) {
  const i = js.indexOf("postRequestWithAuthentication(_t.bids", idx);
  if (i < 0) break;
  console.log(`\n=== bids call @ ${i} ===`);
  console.log(js.slice(i - 400, i + 200));
  idx = i + 50;
  count++;
}
