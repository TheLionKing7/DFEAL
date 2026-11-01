import { fetchBidBuyIllinoisOpportunities } from "../src/lib/sled/bidbuy-illinois";

async function main() {
  const result = await fetchBidBuyIllinoisOpportunities({ limit: 50 });
  console.log("fetched", result.fetched, "opportunities", result.opportunities.length);
  console.log("message", result.message);
  console.log("sample", result.opportunities.slice(0, 3).map((o) => ({
    id: o.external_id,
    title: o.title.slice(0, 60),
    deadline: o.response_deadline,
    agency: o.agency_name,
  })));
}

main().catch(console.error);
