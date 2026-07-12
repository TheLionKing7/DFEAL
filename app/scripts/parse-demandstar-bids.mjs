import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");

const idx = js.indexOf("postRequestWithAuthentication(_t.bids");
console.log(js.slice(idx - 500, idx + 1200));

const loginIdx = js.indexOf("baseURL:jn.api.authUrl");
let pos = 0;
let n = 0;
while (n < 5) {
  const i = js.indexOf("baseURL:jn.api.authUrl", pos);
  if (i < 0) break;
  console.log("\n--- authUrl usage ---");
  console.log(js.slice(i - 150, i + 400));
  pos = i + 20;
  n++;
}

// Find postRequest without auth for login
for (const term of ["postRequest(", "ForgotLogin", "ValidateSecurity", "/access/", "getToken"]) {
  let p = 0;
  let c = 0;
  while (c < 2) {
    const i = js.indexOf(term, p);
    if (i < 0) break;
    if (term === "postRequest(" || term.includes("access")) {
      console.log(`\n--- ${term} ---`);
      console.log(js.slice(i, i + 350));
    }
    p = i + term.length;
    c++;
  }
}
