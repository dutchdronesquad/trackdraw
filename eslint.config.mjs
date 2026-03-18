import nextConfig from "eslint-config-next";
import prettierConfig from "eslint-config-prettier";

const config = [
  ...nextConfig,
  prettierConfig,
  {
    ignores: ["src/components/ui/**"],
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
];

export default config;
