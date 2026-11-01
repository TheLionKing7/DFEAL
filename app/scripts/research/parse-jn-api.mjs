import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
const i = js.indexOf('jn={api:');
console.log(js.slice(i, i + 800));
