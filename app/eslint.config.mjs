import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React Compiler advisory rules: existing data-loading effects predate them.
      // Kept visible as warnings; refactor to Suspense/server data loading over time.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["scripts/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/research/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
