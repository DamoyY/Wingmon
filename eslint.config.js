import { defineConfig } from "eslint/config";
import prettierPlugin from "eslint-plugin-prettier/recommended";
import path from "path";
import { fileURLToPath } from "url";
import tseslint from "typescript-eslint";
import js from "@eslint/js";
import globals from "globals";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(
  {
    name: "global-setup",
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.webextensions },
    },
  },
  {
    name: "js/all-as-warn",
    extends: [js.configs.all],
    rules: Object.fromEntries(
      Object.entries(js.configs.all.rules).map(([ruleName]) => [
        ruleName,
        "warn",
      ]),
    ),
  },
  { name: "js/recommended-as-error", extends: [js.configs.recommended] },
  {
    name: "custom-rules",
    rules: {
      "no-console": "off",
      "import/extensions": "off",
      "no-magic-numbers": "off",
    },
  },
  {
    files: ["**/*.ts"],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
  },
  prettierPlugin,
);
