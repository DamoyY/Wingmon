const { FlatCompat } = require("@eslint/eslintrc");
const globals = require("globals");
const prettierPlugin = require("eslint-plugin-prettier");

const compat = new FlatCompat({ baseDirectory: __dirname });
const browserGlobals = { ...globals.browser, ...globals.webextensions };
module.exports = [
  {
    ignores: ["node_modules/**", "docs/**", "public/system_prompt.md"],
    linterOptions: { reportUnusedDisableDirectives: "warn" },
  },
  ...compat.extends("airbnb-base"),
  ...compat.extends("prettier"),
  {
    plugins: { prettier: prettierPlugin },
    rules: { "prettier/prettier": "error" },
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: browserGlobals,
    },
  },
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: browserGlobals,
    },
  },
];
