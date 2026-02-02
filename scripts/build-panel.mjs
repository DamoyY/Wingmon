import path from "node:path";
import { copyFile, readdir, mkdir, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import * as sass from "sass";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputRoot = path.resolve(rootDir, "..", "dst");
const outputPublicDir = path.join(outputRoot, "public");
const outputToolsIndexPath = path.join(
  outputRoot,
  "src/panel/tools/modules/index.js",
);
const shouldCopyFile = async (source, target) => {
  try {
    const [sourceStat, targetStat] = await Promise.all([
      stat(source),
      stat(target),
    ]);
    return (
      sourceStat.size !== targetStat.size ||
      sourceStat.mtimeMs > targetStat.mtimeMs
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return true;
    }
    throw error;
  }
};

const copyDir = async (source, target) => {
  await mkdir(target, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);
      if (entry.isDirectory()) {
        await copyDir(sourcePath, targetPath);
        return;
      }
      if (entry.isFile()) {
        if (await shouldCopyFile(sourcePath, targetPath)) {
          await copyFile(sourcePath, targetPath);
        }
      }
    }),
  );
};
const toolsDir = path.join(rootDir, "src/panel/tools/modules");
const toolsIndexPath = path.join(toolsDir, "index.js");
const toolFiles = (await readdir(toolsDir))
  .filter(
    (file) =>
      file.endsWith(".js") &&
      file !== "index.js" &&
      file !== "utils.js" &&
      file !== "shared.js" &&
      file !== "toolModuleUtils.js",
  )
  .sort();
const toModuleName = (file) => {
  const baseName = path.basename(file, ".js");
  const camelName = baseName
    .replace(/[-_](\w)/g, (_, char) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9_$]/g, "");
  if (!camelName || /^\d/.test(camelName)) {
    return `tool${camelName}`;
  }
  return camelName;
};
const toolEntries = toolFiles.map((file) => ({
  file,
  name: toModuleName(file),
}));
const toolImports = toolEntries.map(
  ({ file, name }) => `import ${name} from "./${file}";`,
);
const toolList = toolEntries.map(({ name }) => name);
const toolsIndexContent = `${toolImports.join("\n")}\n\nconst toolModules = [\n  ${toolList.join(
  ",\n  ",
)}\n];\n\nexport default toolModules;\n`;
const toolIndexNamespace = "tool-index";
const toolIndexPlugin = {
  name: "tool-index",
  setup(buildContext) {
    buildContext.onResolve({ filter: /index\.js$/ }, (args) => {
      const resolvedPath = path.resolve(args.resolveDir, args.path);
      if (resolvedPath === toolsIndexPath) {
        return { path: resolvedPath, namespace: toolIndexNamespace };
      }
      return null;
    });
    buildContext.onLoad(
      { filter: /.*/, namespace: toolIndexNamespace },
      () => ({
        contents: toolsIndexContent,
        loader: "js",
        resolveDir: toolsDir,
      }),
    );
  },
};

await mkdir(outputRoot, { recursive: true });
await copyFile(
  path.join(rootDir, "manifest.json"),
  path.join(outputRoot, "manifest.json"),
);
await copyDir(
  path.join(rootDir, "_locales"),
  path.join(outputRoot, "_locales"),
);
await copyDir(path.join(rootDir, "src"), path.join(outputRoot, "src"));
await copyDir(path.join(rootDir, "public"), outputPublicDir);
await writeFile(outputToolsIndexPath, toolsIndexContent);

const sassResult = sass.compile(
  path.join(rootDir, "src/panel/styles/panel.scss"),
  {
    loadPaths: [path.join(rootDir, "node_modules")],
    style: "expanded",
    quietDeps: true,
  },
);

await writeFile(path.join(outputPublicDir, "panel.css"), sassResult.css);

await build({
  entryPoints: [path.join(rootDir, "src/panel/index.js")],
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "es2020",
  outfile: path.join(outputPublicDir, "panel.bundle.js"),
  legalComments: "none",
  plugins: [toolIndexPlugin],
});

await build({
  entryPoints: [path.join(rootDir, "src/panel/pages/showHtmlPage.js")],
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "es2020",
  outfile: path.join(outputPublicDir, "show-html.bundle.js"),
  legalComments: "none",
  plugins: [toolIndexPlugin],
});

await build({
  entryPoints: [path.join(rootDir, "src/content/index.js")],
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "es2020",
  outfile: path.join(outputPublicDir, "content.bundle.js"),
  legalComments: "none",
  plugins: [toolIndexPlugin],
});

await copyFile(
  path.join(rootDir, "node_modules/md4w/js/md4w-fast.wasm"),
  path.join(outputPublicDir, "md4w-fast.wasm"),
);

const katexFontsDir = path.join(rootDir, "node_modules/katex/dist/fonts");
const publicFontsDir = path.join(outputPublicDir, "fonts");
await mkdir(publicFontsDir, { recursive: true });
const katexFonts = await readdir(katexFontsDir);
await Promise.all(
  katexFonts.map((file) =>
    copyFile(path.join(katexFontsDir, file), path.join(publicFontsDir, file)),
  ),
);
