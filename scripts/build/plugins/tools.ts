import type { Plugin, PluginBuild } from "esbuild";
import path from "node:path";
import { readdir } from "node:fs/promises";
import { rootDir } from "../basekit/index.ts";

type ToolEntry = { file: string; name: string };

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

export const getToolIndexPlugin = async (): Promise<Plugin> => {
  const toolsDir = path.join(rootDir, "src/server/agent/tools");
  const toolsIndexPath = path.join(toolsDir, "index.ts");
  const toolExtensions = new Set([".js", ".ts", ".tsx"]);
  const excludedToolBases = new Set([
    "index",
    "utils",
    "shared",
    "toolModuleUtils",
    "tabActionRunner",
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

  const toolEntries: ToolEntry[] = toolFiles.map((file) => ({
    file,
    name: toModuleName(file),
  }));
  const toolImports = toolEntries.map(
    ({ file, name }) => `import ${name} from "./${file}";`,
  );
  const toolList = toolEntries.map(({ name }) => name);
  const toolsIndexContent = `${toolImports.join(
    "\n",
  )}\n\nconst toolModules = [\n  ${toolList.join(
    ",\n  ",
  )}\n];\n\nexport default toolModules;\n`;
  const toolIndexNamespace = "tool-index";

  return {
    name: "tool-index",
    setup(buildContext: PluginBuild) {
      buildContext.onResolve({ filter: /index\.(js|ts)$/ }, (args) => {
        const resolvedPath = path.resolve(args.resolveDir, args.path);
        if (resolvedPath === toolsIndexPath) {
          return { namespace: toolIndexNamespace, path: resolvedPath };
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
};
