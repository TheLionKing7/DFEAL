import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
const i = js.indexOf("q3={");
console.log(js.slice(i, i + 1200));

// Find bidStatus active default
const j = js.indexOf('bidStatus:r');
console.log("\n--- bidStatus:r ---");
console.log(js.slice(j - 300, j + 400));

// Find response mapping from bid search
const k = js.indexOf("e.bidName");
console.log("\n--- bid fields ---");
console.log(js.slice(k - 100, k + 600));
