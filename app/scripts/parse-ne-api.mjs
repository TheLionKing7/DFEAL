import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
const i = js.indexOf('"www.demandstar.com"===window.location.hostname');
console.log(js.slice(i, i + 1200));

const j = js.indexOf("function Ne(e)");
console.log("\nNe function:");
console.log(js.slice(j, j + 600));
