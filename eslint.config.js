const js = require("@eslint/js");
const globals = require("globals");

const baseRules = {
  ...js.configs.recommended.rules,
  "no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
    },
  ],
};

const browserGlobals = {
  ...globals.browser,
  ...globals.webextensions,
};

const strictWarnRules = {
  "consistent-return": "warn",
  // curly: "warn",
  "no-alert": "warn",
  "no-console": "warn",
  "no-implicit-globals": "warn",
  "no-implied-eval": "warn",
  "no-new-func": "warn",
  "no-use-before-define": "warn",
  "no-var": "warn",
  "object-shorthand": "warn",
  "prefer-const": "warn",
  "prefer-template": "warn",
};

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "docs/**",
      "public/system_prompt.md",
    ],
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
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
      ...baseRules,
      ...strictWarnRules,
    },
  },
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: browserGlobals,
    },
    rules: {
      ...baseRules,
      ...strictWarnRules,
    },
  },
];
