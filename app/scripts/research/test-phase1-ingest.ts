import { fetchGrantsGovOpportunities } from "../src/lib/grants/grants-gov";
import { fetchSbaOpportunities } from "../src/lib/grants/sba";
import { fetchStateUnivIllinoisOpportunities } from "../src/lib/sled/stateuniv-illinois";
import { fetchBonfireOpportunities } from "../src/lib/sled/bonfire";
import { fetchIllinoisEducationOpportunities } from "../src/lib/sled/illinois-education";

async function main() {
  const grants = await fetchGrantsGovOpportunities({ limit: 5 });
  console.log("Grants.gov", grants.message, grants.opportunities.length);

  const sba = await fetchSbaOpportunities({ limit: 10 });
  console.log("SBA", sba.message, sba.opportunities.length);

  const stateuniv = await fetchStateUnivIllinoisOpportunities({ limit: 10 });
  console.log("StateUniv", stateuniv.message, stateuniv.opportunities.length);

  const education = await fetchIllinoisEducationOpportunities({ limit: 10 });
  console.log("Education IL", education.message, education.opportunities.length);

  const bonfire = await fetchBonfireOpportunities({ limit: 10 });
  console.log("Bonfire", bonfire.message, bonfire.opportunities.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
