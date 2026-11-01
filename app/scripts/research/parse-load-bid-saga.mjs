import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
const i = js.indexOf("t_.TRIGGER");
console.log("first t_.TRIGGER", i);
console.log(js.slice(i - 500, i + 1500));
