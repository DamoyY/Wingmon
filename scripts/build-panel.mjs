import path from "node:path";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import * as sass from "sass";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const sassResult = sass.compile(
  path.join(rootDir, "src/panel/styles/panel.scss"),
  {
    loadPaths: [path.join(rootDir, "node_modules")],
    style: "expanded",
    quietDeps: true,
  },
);

await writeFile(path.join(rootDir, "public/panel.css"), sassResult.css);

await build({
  entryPoints: [path.join(rootDir, "src/panel/index.js")],
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "es2020",
  outfile: path.join(rootDir, "public/panel.bundle.js"),
  legalComments: "none",
});
