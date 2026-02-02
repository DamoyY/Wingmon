import path from "node:path";
import type { Dirent } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build, type Metafile, type Plugin, type PluginBuild } from "esbuild";
import JavaScriptObfuscator from "javascript-obfuscator";
import * as sass from "sass";

type Manifest = {
  background?: Record<string, unknown>;
  icons?: Record<string, unknown>;
} & Record<string, unknown>;

type ToolEntry = { file: string; name: string };

type ObfuscatorOptions = Parameters<typeof JavaScriptObfuscator.obfuscate>[1];

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputRoot = path.resolve(rootDir, "..", "dst");
const outputPublicDir = path.join(outputRoot, "public");

const obfuscatorOptions: ObfuscatorOptions = {
  controlFlowFlattening: false,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 1,
  debugProtection: false,
  compact: true,
  identifierNamesGenerator: "hexadecimal",
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayCallsTransform: false,
  stringArrayEncoding: ["base64"],
  stringArrayRotate: true,
  stringArrayIndexShift: true,
  stringArrayShuffle: true,
  stringArrayThreshold: 0.75,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersType: "variable",
  transformObjectKeys: false,
  unicodeEscapeSequence: true,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error;

const nodeModulesPattern = /(^|[\\/])node_modules([\\/]|$)/;

const isNodeModulesPath = (filePath: string): boolean =>
  nodeModulesPattern.test(path.normalize(filePath));

const shouldObfuscateBuild = (metafile: Metafile | undefined): boolean => {
  if (!metafile) {
    throw new Error("构建结果缺少 metafile");
  }
  return !Object.keys(metafile.inputs).some((input) =>
    isNodeModulesPath(input),
  );
};

const ensureString = (value: unknown, context: string): string => {
  if (typeof value !== "string") {
    throw new Error(`${context} 必须是字符串`);
  }
  return value;
};

const shouldCopyFile = async (
  source: string,
  target: string,
): Promise<boolean> => {
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
    if (isErrnoException(error) && error.code === "ENOENT") {
      return true;
    }
    throw error;
  }
};

const obfuscateCode = (source: string): string => {
  const result = JavaScriptObfuscator.obfuscate(source, obfuscatorOptions);
  return result.getObfuscatedCode();
};

const obfuscateFile = async (filePath: string): Promise<void> => {
  const source = await readFile(filePath, "utf8");
  const obfuscated = obfuscateCode(source);
  await writeFile(filePath, obfuscated);
};

const entryExtensions = [".ts", ".tsx", ".js", ".mjs", ".cjs"] as const;

const resolveEntryPath = async (basePath: string): Promise<string> => {
  for (const extension of entryExtensions) {
    const candidate = `${basePath}${extension}`;
    try {
      await stat(candidate);
      return candidate;
    } catch (error) {
      if (!isErrnoException(error) || error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  throw new Error(`未找到入口文件: ${basePath}`);
};

const copyDir = async (source: string, target: string): Promise<void> => {
  await mkdir(target, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry: Dirent) => {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);
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
};

const flattenTargets = new Map<string, string>();

const ensureFlattenTarget = (targetPath: string, sourcePath: string): void => {
  const existingSource = flattenTargets.get(targetPath);
  if (existingSource && existingSource !== sourcePath) {
    throw new Error(
      `输出冲突: ${sourcePath} 与 ${existingSource} -> ${targetPath}`,
    );
  }
  flattenTargets.set(targetPath, sourcePath);
};

const rewritePublicHtml = (fileName: string, contents: string): string => {
  if (fileName === "sandbox.html") {
    return contents.replaceAll("sandbox/", "");
  }
  if (fileName === "panel.html") {
    return contents.replaceAll("icons/", "");
  }
  return contents;
};

const copyDirFlat = async (source: string, target: string): Promise<void> => {
  const entries = await readdir(source, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry: Dirent) => {
      const sourcePath = path.join(source, entry.name);
      if (entry.isDirectory()) {
        await copyDirFlat(sourcePath, target);
        return;
      }
      if (!entry.isFile()) {
        return;
      }
      const ext = path.extname(entry.name);
      if (ext === ".ts" || ext === ".tsx") {
        return;
      }
      const targetPath = path.join(target, entry.name);
      ensureFlattenTarget(targetPath, sourcePath);
      if (ext === ".html") {
        const html = await readFile(sourcePath, "utf8");
        const rewrittenHtml = rewritePublicHtml(entry.name, html);
        await writeFile(targetPath, rewrittenHtml);
        return;
      }
      if (ext === ".js") {
        if (isNodeModulesPath(sourcePath)) {
          if (await shouldCopyFile(sourcePath, targetPath)) {
            await copyFile(sourcePath, targetPath);
          }
          return;
        }
        const source = await readFile(sourcePath, "utf8");
        const obfuscated = obfuscateCode(source);
        await writeFile(targetPath, obfuscated);
        return;
      }
      if (await shouldCopyFile(sourcePath, targetPath)) {
        await copyFile(sourcePath, targetPath);
      }
    }),
  );
};

const flattenManifestPath = (value: string): string =>
  value.replaceAll("public/icons/", "public/");

const normalizeManifestIcons = (
  icons: Record<string, unknown>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(icons).map(([size, iconPath]) => [
      size,
      flattenManifestPath(ensureString(iconPath, `manifest.icons.${size}`)),
    ]),
  );

const toolsDir = path.join(rootDir, "src/panel/tools/modules");
const toolsIndexPath = path.join(toolsDir, "index.js");
const toolExtensions = new Set([".js", ".ts", ".tsx"]);
const excludedToolBases = new Set([
  "index",
  "utils",
  "shared",
  "toolModuleUtils",
]);

const toolFiles = (await readdir(toolsDir))
  .filter((file) => {
    const ext = path.extname(file);
    if (!toolExtensions.has(ext)) {
      return false;
    }
    const baseName = path.basename(file, ext);
    return !excludedToolBases.has(baseName);
  })
  .sort();

const toModuleName = (file: string): string => {
  const baseName = path.basename(file, path.extname(file));
  const camelName = baseName
    .replace(/[-_](\w)/g, (_match, char: string) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9_$]/g, "");
  if (!camelName || /^\d/.test(camelName)) {
    return `tool${camelName}`;
  }
  return camelName;
};

const toolEntries: ToolEntry[] = toolFiles.map((file) => ({
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

const toolIndexPlugin: Plugin = {
  name: "tool-index",
  setup(buildContext: PluginBuild) {
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

const panelEntryPoint = await resolveEntryPath(
  path.join(rootDir, "src/panel/index"),
);
const showHtmlEntryPoint = await resolveEntryPath(
  path.join(rootDir, "src/panel/pages/showHtmlPage"),
);
const contentEntryPoint = await resolveEntryPath(
  path.join(rootDir, "src/content/index"),
);
const backgroundEntryPoint = await resolveEntryPath(
  path.join(rootDir, "src/background/index"),
);
const sandboxCommandEntryPoint = await resolveEntryPath(
  path.join(rootDir, "public/sandbox/runConsoleCommand"),
);

await mkdir(outputRoot, { recursive: true });
await mkdir(outputPublicDir, { recursive: true });

const manifestPath = path.join(rootDir, "manifest.json");
const manifestContents = await readFile(manifestPath, "utf8");
const manifestData: unknown = JSON.parse(manifestContents);
if (!isRecord(manifestData)) {
  throw new Error("manifest.json 必须是对象");
}
const manifest: Manifest = manifestData;
if (manifest.background !== undefined && !isRecord(manifest.background)) {
  throw new Error("manifest.background 必须是对象");
}
const existingBackground =
  isRecord(manifest.background) ? manifest.background : {};
manifest.background = {
  ...existingBackground,
  service_worker: "background.js",
};
if (manifest.icons !== undefined) {
  if (!isRecord(manifest.icons)) {
    throw new Error("manifest.icons 必须是对象");
  }
  manifest.icons = normalizeManifestIcons(manifest.icons);
}

await writeFile(
  path.join(outputRoot, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await copyDir(
  path.join(rootDir, "_locales"),
  path.join(outputRoot, "_locales"),
);
await copyDirFlat(path.join(rootDir, "public"), outputPublicDir);

const sassResult = sass.compile(
  path.join(rootDir, "src/panel/styles/panel.scss"),
  {
    loadPaths: [path.join(rootDir, "node_modules")],
    style: "expanded",
    quietDeps: true,
  },
);

const panelCssPath = path.join(outputPublicDir, "panel.css");
const panelCss = sassResult.css.replace(/url\((["']?)fonts\//g, "url($1");
ensureFlattenTarget(panelCssPath, "build:panel.css");
await writeFile(panelCssPath, panelCss);

const panelBundlePath = path.join(outputPublicDir, "panel.bundle.js");
ensureFlattenTarget(panelBundlePath, "build:panel.bundle.js");
const panelBuildResult = await build({
  entryPoints: [panelEntryPoint],
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "esnext",
  outfile: panelBundlePath,
  legalComments: "none",
  metafile: true,
  plugins: [toolIndexPlugin],
});
if (shouldObfuscateBuild(panelBuildResult.metafile)) {
  await obfuscateFile(panelBundlePath);
}

const showHtmlBundlePath = path.join(outputPublicDir, "show-html.bundle.js");
ensureFlattenTarget(showHtmlBundlePath, "build:show-html.bundle.js");
const showHtmlBuildResult = await build({
  entryPoints: [showHtmlEntryPoint],
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "esnext",
  outfile: showHtmlBundlePath,
  legalComments: "none",
  metafile: true,
  plugins: [toolIndexPlugin],
});
if (shouldObfuscateBuild(showHtmlBuildResult.metafile)) {
  await obfuscateFile(showHtmlBundlePath);
}

const contentBundlePath = path.join(outputPublicDir, "content.bundle.js");
ensureFlattenTarget(contentBundlePath, "build:content.bundle.js");
const contentBuildResult = await build({
  entryPoints: [contentEntryPoint],
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "esnext",
  outfile: contentBundlePath,
  legalComments: "none",
  metafile: true,
  plugins: [toolIndexPlugin],
});
if (shouldObfuscateBuild(contentBuildResult.metafile)) {
  await obfuscateFile(contentBundlePath);
}

const runConsoleCommandPath = path.join(
  outputPublicDir,
  "runConsoleCommand.js",
);
ensureFlattenTarget(runConsoleCommandPath, "build:runConsoleCommand.js");
const runConsoleCommandBuildResult = await build({
  entryPoints: [sandboxCommandEntryPoint],
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "esnext",
  outfile: runConsoleCommandPath,
  legalComments: "none",
  metafile: true,
});
if (shouldObfuscateBuild(runConsoleCommandBuildResult.metafile)) {
  await obfuscateFile(runConsoleCommandPath);
}

const backgroundBundlePath = path.join(outputRoot, "background.js");
const backgroundBuildResult = await build({
  entryPoints: [backgroundEntryPoint],
  bundle: true,
  format: "esm",
  minify: true,
  platform: "browser",
  target: "esnext",
  outfile: backgroundBundlePath,
  legalComments: "none",
  metafile: true,
});
if (shouldObfuscateBuild(backgroundBuildResult.metafile)) {
  await obfuscateFile(backgroundBundlePath);
}

const md4wWasmSource = path.join(
  rootDir,
  "node_modules/md4w/js/md4w-fast.wasm",
);
const md4wWasmTarget = path.join(outputPublicDir, "md4w-fast.wasm");
ensureFlattenTarget(md4wWasmTarget, md4wWasmSource);
if (await shouldCopyFile(md4wWasmSource, md4wWasmTarget)) {
  await copyFile(md4wWasmSource, md4wWasmTarget);
}

const katexFontsDir = path.join(rootDir, "node_modules/katex/dist/fonts");
const katexFonts = await readdir(katexFontsDir);
await Promise.all(
  katexFonts.map(async (file) => {
    const sourcePath = path.join(katexFontsDir, file);
    const targetPath = path.join(outputPublicDir, file);
    ensureFlattenTarget(targetPath, sourcePath);
    if (await shouldCopyFile(sourcePath, targetPath)) {
      await copyFile(sourcePath, targetPath);
    }
  }),
);
