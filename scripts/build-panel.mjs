import path from "node:path";
import { copyFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import * as sass from "sass";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const toolsDir = path.join(rootDir, "src/panel/tools/modules");
const toolsIndexPath = path.join(toolsDir, "index.js");
const toolFiles = (await readdir(toolsDir))
  .filter(
    (file) =>
      file.endsWith(".js") && file !== "index.js" && file !== "shared.js",
  )
  .sort();
const toolImports = toolFiles.map(
  (file, index) => `import tool${index} from "./${file}";`,
);
const toolList = toolFiles.map((_, index) => `tool${index}`);
const toolsIndexContent = `${toolImports.join("\n")}\n\nconst toolModules = [\n  ${toolList.join(
  ",\n  ",
)}\n];\n\nexport default toolModules;\n`;
await writeFile(toolsIndexPath, toolsIndexContent);

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

await copyFile(
  path.join(rootDir, "node_modules/md4w/js/md4w-fast.wasm"),
  path.join(rootDir, "public/md4w-fast.wasm"),
);

const katexFontsDir = path.join(rootDir, "node_modules/katex/dist/fonts");
const publicFontsDir = path.join(rootDir, "public/fonts");
await mkdir(publicFontsDir, { recursive: true });
const katexFonts = await readdir(katexFontsDir);
await Promise.all(
  katexFonts.map((file) =>
    copyFile(path.join(katexFontsDir, file), path.join(publicFontsDir, file)),
  ),
);
