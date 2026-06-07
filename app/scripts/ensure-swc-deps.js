/**
 * Ensures @next/swc platform packages are listed in the lockfile for Vercel/CI.
 * Next.js patches the lockfile during build if they are missing; optionalDependencies
 * + npm install prevents the "lockfile missing swc dependencies" warning.
 */
const { execSync } = require("node:child_process");

try {
  execSync("npx --yes next telemetry disable", { stdio: "ignore" });
} catch {
  // non-fatal
}
