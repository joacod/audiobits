import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "eslint-config-next/core-web-vitals";

export default [
  {
    ignores: [
      // Vendored agent tools retain their upstream code and conventions.
      "apps/www/.agents/skills/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.source/**",
      "**/next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  { settings: { next: { rootDir: "apps/www/" } } },
  ...tseslint.configs.recommended,
  ...next.map((config) => ({ ...config, files: ["apps/www/**/*.{ts,tsx}"] })),
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        Buffer: "readonly",
      },
    },
  },
];
