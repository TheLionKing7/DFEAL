import { readFileSync } from "fs";
import crypto from "crypto";

const js = readFileSync("demandstar-main.js", "utf8");
const fields = ["governmentType", "govType", "stateCode", "stateName", "agencyState", "memberState", "bidState"];
for (const f of fields) {
  const count = (js.match(new RegExp(f, "g")) || []).length;
  if (count > 0 && count < 500) console.log(f, count);
}

// sample bid row props from nSt - search bidName,e.agency
const i = js.indexOf("bidName:e.bidName");
console.log("\n", js.slice(i - 200, i + 800));
