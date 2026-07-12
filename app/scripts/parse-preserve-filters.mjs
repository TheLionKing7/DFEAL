import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");

let idx = 0;
let count = 0;
while (count < 8) {
  const i = js.indexOf("preserveFilters", idx);
  if (i < 0) break;
  const ctx = js.slice(i - 200, i + 400);
  if (ctx.includes("a7") || ctx.includes("filters") || ctx.includes("bidscurrentPage")) {
    console.log(`\n=== @ ${i} ===`);
    console.log(ctx);
    count++;
  }
  idx = i + 20;
}
