import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
console.log("len", js.length);

const patterns = [
  /\/api\/[a-zA-Z0-9/_-]+/g,
  /demandstar\.com\/[a-zA-Z0-9/_-]+/g,
  /eunasolutions\.com\/[a-zA-Z0-9/_-]+/g,
  /"login[^"]{0,60}"/gi,
  /BidSearch|searchBids|getBids|fetchBids|bidList/g,
  /REACT_APP_[A-Z_]+/g,
  /baseURL[^,]{0,120}/g,
];

for (const p of patterns) {
  const m = [...js.matchAll(p)].map((x) => x[0]);
  const uniq = [...new Set(m)];
  console.log("\n", p, "count", uniq.length);
  console.log(uniq.slice(0, 30).join("\n"));
}
