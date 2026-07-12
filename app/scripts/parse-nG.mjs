import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
const i = js.indexOf("function nG(");
console.log(js.slice(i, i + 800));
