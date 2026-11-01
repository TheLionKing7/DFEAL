import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");
const markers = [
  "api:{url:",
  "authUrl:",
  "contractUrl:",
  "REACT_APP_API_CONTRACTURL",
  "jn.api.url",
  "baseURL:jn.api.url",
];

for (const m of markers) {
  let pos = 0;
  let n = 0;
  while (n < 2) {
    const i = js.indexOf(m, pos);
    if (i < 0) break;
    console.log(`\n--- ${m} @ ${i} ---`);
    console.log(js.slice(i, i + 250));
    pos = i + m.length;
    n++;
  }
}
