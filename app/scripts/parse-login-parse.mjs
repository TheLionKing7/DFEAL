import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
const i = js.indexOf("accountId:Number(w)");
console.log(js.slice(i - 800, i + 400));
