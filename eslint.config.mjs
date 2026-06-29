import { fixupConfigRules } from "@eslint/compat";
import * as espree from "espree";
import nextConfig from "eslint-config-next";
import prettierConfig from "eslint-config-prettier";

const config = [
  ...fixupConfigRules(nextConfig),
  prettierConfig,
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "coverage/**",
      "cloudflare-env.d.ts",
      "src/components/ui/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      parser: espree,
    },
  },
];

export default config;
