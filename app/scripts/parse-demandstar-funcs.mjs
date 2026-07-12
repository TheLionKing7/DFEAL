import { readFileSync } from "fs";

const js = readFileSync("demandstar-main.js", "utf8");

function findFunc(name) {
  const patterns = [
    `function ${name}(`,
    `${name}=function(`,
    `${name}:function(`,
  ];
  for (const p of patterns) {
    const i = js.indexOf(p);
    if (i >= 0) {
      console.log(`\n=== ${p} @ ${i} ===`);
      console.log(js.slice(i, i + 800));
      return;
    }
  }
  console.log("not found", name);
}

findFunc("MZ");
findFunc("CQ");
findFunc("t_");
findFunc("eG.postRequest");
findFunc("postRequestWithAuthentication");
