import path from "node:path";
import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import * as sass from "sass";

const rootDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  ),
  outputRoot = path.resolve(rootDir, "..", "dst"),
  outputPublicDir = path.join(outputRoot, "public"),
  outputToolsIndexPath = path.join(
    outputRoot,
    "src/panel/tools/modules/index.js",
  ),
  shouldCopyFile = async (source, target) => {
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
  },
  entryExtensions = [".ts", ".tsx", ".js", ".mjs", ".cjs"],
  resolveEntryPath = async (basePath) => {
    const foundPath = await entryExtensions.reduce(
      async (resultPromise, extension) => {
        const result = await resultPromise;
        if (result) {
          return result;
        }
        const candidate = `${basePath}${extension}`;
        try {
          await stat(candidate);
          return candidate;
        } catch (error) {
          if (error.code !== "ENOENT") {
            throw error;
          }
          return null;
        }
      },
      Promise.resolve(null),
    );
    if (!foundPath) {
      throw new Error(`未找到入口文件: ${basePath}`);
    }
    return foundPath;
  },
  copyDir = async (source, target) => {
    await mkdir(target, { recursive: true });
    const entries = await readdir(source, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const sourcePath = path.join(source, entry.name),
          targetPath = path.join(target, entry.name);
        if (entry.isDirectory()) {
          await copyDir(sourcePath, targetPath);
          return;
        }
        if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (ext === ".ts" || ext === ".tsx") {
            return;
          }
          if (await shouldCopyFile(sourcePath, targetPath)) {
            await copyFile(sourcePath, targetPath);
          }
        }
      }),
    );
  },
  toolsDir = path.join(rootDir, "src/panel/tools/modules"),
  toolsIndexPath = path.join(toolsDir, "index.js"),
  toolExtensions = [".js", ".ts", ".tsx"],
  excludedToolBases = new Set(["index", "utils", "shared", "toolModuleUtils"]),
  toolFiles = (await readdir(toolsDir))
    .filter((file) => {
      const ext = path.extname(file);
      if (!toolExtensions.includes(ext)) {
        return false;
      }
      const baseName = path.basename(file, ext);
      return !excludedToolBases.has(baseName);
    })
    .sort(),
  toModuleName = (file) => {
    const baseName = path.basename(file, path.extname(file)),
      camelName = baseName
        .replace(/[-_](\w)/g, (_, char) => char.toUpperCase())
        .replace(/[^a-zA-Z0-9_$]/g, "");
    if (!camelName || /^\d/.test(camelName)) {
      return `tool${camelName}`;
    }
    return camelName;
  },
  toolEntries = toolFiles.map((file) => ({
    file,
    name: toModuleName(file),
  })),
  toolImports = toolEntries.map(
    ({ file, name }) => `import ${name} from "./${file}";`,
  ),
  toolList = toolEntries.map(({ name }) => name),
  toolsIndexContent = `${toolImports.join("\n")}\n\nconst toolModules = [\n  ${toolList.join(
    ",\n  ",
  )}\n];\n\nexport default toolModules;\n`,
  toolIndexNamespace = "tool-index",
  toolIndexPlugin = {
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
  },
  panelEntryPoint = await resolveEntryPath(
    path.join(rootDir, "src/panel/index"),
  ),
  showHtmlEntryPoint = await resolveEntryPath(
    path.join(rootDir, "src/panel/pages/showHtmlPage"),
  ),
  contentEntryPoint = await resolveEntryPath(
    path.join(rootDir, "src/content/index"),
  ),
  backgroundEntryPoint = await resolveEntryPath(
    path.join(rootDir, "src/background/index"),
  ),
  sandboxCommandEntryPoint = await resolveEntryPath(
    path.join(rootDir, "public/sandbox/runConsoleCommand"),
  );

await mkdir(outputRoot, { recursive: true });
await copyFile(
  path.join(rootDir, "manifest.json"),
  path.join(outputRoot, "manifest.json"),
);
await copyDir(
  path.join(rootDir, "_locales"),
  path.join(outputRoot, "_locales"),
);
await copyDir(path.join(rootDir, "public"), outputPublicDir);
await mkdir(path.dirname(outputToolsIndexPath), { recursive: true });
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
  entryPoints: [panelEntryPoint],
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "esnext",
  outfile: path.join(outputPublicDir, "panel.bundle.js"),
  legalComments: "none",
  plugins: [toolIndexPlugin],
});

await build({
  entryPoints: [showHtmlEntryPoint],
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "esnext",
  outfile: path.join(outputPublicDir, "show-html.bundle.js"),
  legalComments: "none",
  plugins: [toolIndexPlugin],
});

await build({
  entryPoints: [contentEntryPoint],
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "esnext",
  outfile: path.join(outputPublicDir, "content.bundle.js"),
  legalComments: "none",
  plugins: [toolIndexPlugin],
});

await build({
  entryPoints: [sandboxCommandEntryPoint],
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "esnext",
  outfile: path.join(outputPublicDir, "sandbox/runConsoleCommand.js"),
  legalComments: "none",
});

await build({
  entryPoints: [backgroundEntryPoint],
  bundle: true,
  format: "esm",
  minify: true,
  platform: "browser",
  target: "esnext",
  outfile: path.join(outputRoot, "src/background/index.js"),
  legalComments: "none",
});

await copyFile(
  path.join(rootDir, "node_modules/md4w/js/md4w-fast.wasm"),
  path.join(outputPublicDir, "md4w-fast.wasm"),
);

const katexFontsDir = path.join(rootDir, "node_modules/katex/dist/fonts"),
  publicFontsDir = path.join(outputPublicDir, "fonts");
await mkdir(publicFontsDir, { recursive: true });
const katexFonts = await readdir(katexFontsDir);
await Promise.all(
  katexFonts.map((file) =>
    copyFile(path.join(katexFontsDir, file), path.join(publicFontsDir, file)),
  ),
);
