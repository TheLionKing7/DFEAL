import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
for (const term of ["function Tn(", "Authorization:\"Bearer", ".data.token", "accountId", "gettoken"]) {
  const i = js.indexOf(term);
  if (i >= 0) {
    console.log(`\n--- ${term} @ ${i} ---`);
    console.log(js.slice(i, i + 600));
  }
}
