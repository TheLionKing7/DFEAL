import { readFileSync, writeFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
const start = js.indexOf("_t={");
const end = js.indexOf("};", start + 5000);
const block = js.slice(start, start + 15000);
writeFileSync("demandstar-routes-snippet.txt", block);
console.log("wrote", block.length, "chars");

const routes = [...block.matchAll(/([a-zA-Z0-9_]+):"(\/[^"]+)"/g)];
const bidRoutes = routes.filter(([, , path]) => /bid|search|browse|quote|contract/i.test(path));
console.log("bid routes", bidRoutes.length);
for (const [, name, path] of bidRoutes) console.log(name, path);
