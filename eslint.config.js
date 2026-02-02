const { FlatCompat } = require("@eslint/eslintrc");
const globals = require("globals");
const prettierPlugin = require("eslint-plugin-prettier");

const compat = new FlatCompat({ baseDirectory: __dirname });
const browserGlobals = { ...globals.browser, ...globals.webextensions };
module.exports = [
  {
    ignores: [
      "node_modules/**",
      "docs/**",
      "public/system_prompt.md",
      "public/panel.bundle.js",
      "public/show-html.bundle.js",
      "public/content.bundle.js",
    ],
  },
  { linterOptions: { reportUnusedDisableDirectives: "warn" } },
  ...compat.extends("airbnb-base"),
  ...compat.extends("prettier"),
  {
    plugins: { prettier: prettierPlugin },
    rules: { "prettier/prettier": "error" },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      "import/no-extraneous-dependencies": ["error", { devDependencies: true }],
    },
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: browserGlobals,
    },
    rules: {
      "import/extensions": [
        "error",
        "ignorePackages",
        { js: "always", mjs: "always", cjs: "always" },
      ],
      "no-console": "off",
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
  {
    files: ["public/sandbox.js", "public/sandbox/runConsoleCommand.js"],
    rules: { "no-eval": "off" },
  },
];
