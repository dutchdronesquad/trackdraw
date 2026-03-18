import nextConfig from "eslint-config-next";
import prettierConfig from "eslint-config-prettier";

const config = [
  ...nextConfig,
  prettierConfig,
  {
    ignores: ["src/components/ui/**"],
  },
];

export default config;
