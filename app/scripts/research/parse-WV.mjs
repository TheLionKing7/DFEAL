import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
const i = js.indexOf("function WV(");
console.log(js.slice(i, i + 400));

// find what gettoken returns - search Hashed:o
const j = js.indexOf("Hashed:o");
console.log("\n--- Hashed ---");
console.log(js.slice(j - 300, j + 500));
