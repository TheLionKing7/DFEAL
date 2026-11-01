import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");

const needles = [
  "case HI:",
  "LOGIN saga",
  "loginusername",
  "ForgotLogin",
  "/login",
  "accessToken",
  "refresh_token",
  "LOAD_BID_RESULT",
  "t_,e",
  "postRequestWithAuthentication(_t.bids",
  "postRequestWithAuthentication(_t.browseBids",
  'url:"/login"',
  "auth/login",
];

for (const needle of needles) {
  const i = js.indexOf(needle);
  if (i >= 0) {
    console.log(`\n=== ${needle} @ ${i} ===`);
    console.log(js.slice(Math.max(0, i - 100), i + 600));
  } else {
    console.log(`\n=== ${needle} NOT FOUND ===`);
  }
}
