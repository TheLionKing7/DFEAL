import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");

// bid list row component nSt - search bidId, bidName, agencyName, dueDate, state
for (const term of ["e.bidIdentifier", "e.agencyName", "e.dueDateTime", "e.stateName", "e.governmentType", "statusType:e.status"]) {
  let pos = 0;
  let n = 0;
  while (n < 2) {
    const i = js.indexOf(term, pos);
    if (i < 0) break;
    console.log(`\n--- ${term} ---`);
    console.log(js.slice(i - 80, i + 400));
    pos = i + term.length;
    n++;
  }
}

// Illinois state code in filters
const il = js.indexOf('states:["IL"]');
console.log("\nIL filter", il);

const il2 = js.indexOf('"IL"');
console.log("IL mentions near states", js.slice(js.indexOf("states:"), js.indexOf("states:") + 500));
