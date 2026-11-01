import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
const i = js.indexOf("bids.search.result");
console.log(js.slice(i - 500, i + 1500));
