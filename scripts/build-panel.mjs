import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

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
