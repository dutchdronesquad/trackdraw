import nextConfig from "eslint-config-next";
import prettierConfig from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const config = [
  ...nextConfig,
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
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
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
];

export default config;
