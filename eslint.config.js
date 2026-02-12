import { defineConfig } from "eslint/config";
import { fileURLToPath } from "url";
import globals from "globals";
import js from "@eslint/js";
import path from "path";
import prettierPlugin from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";
const dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(
  {
    languageOptions: {
      ecmaVersion: "latest",
      globals: { ...globals.browser, ...globals.webextensions },
      sourceType: "module",
    },
    name: "global-setup",
  },
  {
    extends: [js.configs.all],
    name: "js/all-as-warn",
    rules: Object.fromEntries(
      Object.entries(js.configs.all.rules).map(([ruleName]) => [
        ruleName,
        "warn",
      ]),
    ),
  },
  { extends: [js.configs.recommended], name: "js/recommended-as-error" },
  {
    name: "custom-rules",
    rules: {
      "import/extensions": "off",
      "max-lines": "off",
      "max-lines-per-function": "off",
      "max-params": "off",
      "max-statements": "off",
      "no-console": "off",
      "no-magic-numbers": "off",
      "no-ternary": "off",
      "one-var": "off",
      "sort-vars": "off",
    },
  },
  {
    extends: [...tseslint.configs.strictTypeChecked],
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: dirname },
    },
  },
  prettierPlugin,
);
