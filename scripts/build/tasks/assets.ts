import {
  type FlatCopyProcessor,
  publicAssetProcessors,
  resolveFlatCopyAction,
} from "../transformers/index.ts";
import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import {
  ensureFlattenTarget,
  outputPublicDir,
  outputRoot,
  rootDir,
  shouldCopyFile,
} from "../basekit/index.ts";
import type { Dirent } from "node:fs";
import path from "node:path";

const nonCopyExtensions = new Set([".ts", ".tsx", ".md"]);

const shouldSkipByExtension = (fileName: string): boolean =>
  nonCopyExtensions.has(path.extname(fileName).toLowerCase());

export const copyDir = async (
  source: string,
  target: string,
): Promise<void> => {
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
        if (shouldSkipByExtension(entry.name)) {
          return;
        }
        if (await shouldCopyFile(sourcePath, targetPath)) {
          await copyFile(sourcePath, targetPath);
        }
      }
    }),
  );
};

export const copyDirFlat = async (
  source: string,
  target: string,
  processors: readonly FlatCopyProcessor[] = [],
): Promise<void> => {
  const entries = await readdir(source, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry: Dirent) => {
      const sourcePath = path.join(source, entry.name);
      if (entry.isDirectory()) {
        await copyDirFlat(sourcePath, target, processors);
        return;
      }
      if (!entry.isFile()) {
        return;
      }
      if (shouldSkipByExtension(entry.name)) {
        return;
      }
      const ext = path.extname(entry.name).toLowerCase();
      const targetPath = path.join(target, entry.name);
      ensureFlattenTarget(targetPath, sourcePath);
      const action = await resolveFlatCopyAction(
        {
          extension: ext,
          fileName: entry.name,
          sourcePath,
          targetPath,
        },
        processors,
      );
      if (action.type === "skip") {
        return;
      }
      if (action.type === "write") {
        await writeFile(targetPath, action.content);
        return;
      }
      if (await shouldCopyFile(sourcePath, targetPath)) {
        await copyFile(sourcePath, targetPath);
      }
    }),
  );
};

export const copyAssets = async (): Promise<void> => {
  // Locale copy
  await copyDir(
    path.join(rootDir, "_locales"),
    path.join(outputRoot, "_locales"),
  );
  // Public copy
  await copyDirFlat(
    path.join(rootDir, "public"),
    outputPublicDir,
    publicAssetProcessors,
  );

  // WASM
  const md4wWasmSource = path.join(
    rootDir,
    "node_modules/md4w/js/md4w-fast.wasm",
  );
  const md4wWasmTarget = path.join(outputPublicDir, "md4w-fast.wasm");
  ensureFlattenTarget(md4wWasmTarget, md4wWasmSource);
  if (await shouldCopyFile(md4wWasmSource, md4wWasmTarget)) {
    await copyFile(md4wWasmSource, md4wWasmTarget);
  }

  // Katex Fonts
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
};
