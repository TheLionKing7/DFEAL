import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
const i = js.indexOf("auth/gettoken");
console.log(js.slice(i - 200, i + 1200));
