import {
  ensureFlattenTarget,
  outputPublicDir,
  outputRoot,
  resolveEntryPath,
  rootDir,
} from "../basekit/index.ts";
import { obfuscateFile, shouldObfuscateBuild } from "../transformers/index.ts";
import type { BuildCliOptions } from "../cliOptions.ts";
import { build } from "esbuild";
import { getToolIndexPlugin } from "../plugins/index.ts";
import path from "node:path";

const shouldRunObfuscation = (
  metafile: Parameters<typeof shouldObfuscateBuild>[0],
  options: BuildCliOptions,
): boolean => {
  return options.obfuscate && shouldObfuscateBuild(metafile);
};

export const buildBundles = async (options: BuildCliOptions): Promise<void> => {
  const toolIndexPlugin = await getToolIndexPlugin();
  const loader = { ".md": "text", ".wasm": "binary" };

  const panelEntryPoint = await resolveEntryPath(
    path.join(rootDir, "src/sidepanel/index"),
  );
  const showHtmlEntryPoint = await resolveEntryPath(
    path.join(rootDir, "src/sidepanel/pages/show-html/index"),
  );
  const offscreenEntryPoint = await resolveEntryPath(
    path.join(rootDir, "src/offscreen/index"),
  );
  const contentEntryPoint = await resolveEntryPath(
    path.join(rootDir, "src/content/index"),
  );
  const backgroundEntryPoint = await resolveEntryPath(
    path.join(rootDir, "src/background/index"),
  );
  const sandboxEntryPoint = await resolveEntryPath(
    path.join(rootDir, "src/sandbox/index"),
  );

  const panelBundlePath = path.join(outputPublicDir, "panel.bundle.js");
  ensureFlattenTarget(panelBundlePath, "build:panel.bundle.js");
  const panelBuildResult = await build({
    bundle: true,
    entryPoints: [panelEntryPoint],
    format: "iife",
    legalComments: "none",
    metafile: true,
    minify: true,
    outfile: panelBundlePath,
    platform: "browser",
    target: "esnext",
    loader,
    plugins: [toolIndexPlugin],
  });
  if (!panelBuildResult.metafile) {
    throw new Error("panel 构建结果缺少 metafile");
  }
  if (shouldRunObfuscation(panelBuildResult.metafile, options)) {
    await obfuscateFile(panelBundlePath);
  }

  const showHtmlBundlePath = path.join(outputPublicDir, "show-html.bundle.js");
  ensureFlattenTarget(showHtmlBundlePath, "build:show-html.bundle.js");
  const showHtmlBuildResult = await build({
    bundle: true,
    entryPoints: [showHtmlEntryPoint],
    format: "iife",
    legalComments: "none",
    metafile: true,
    minify: true,
    outfile: showHtmlBundlePath,
    platform: "browser",
    target: "esnext",
    loader,
    plugins: [toolIndexPlugin],
  });
  if (!showHtmlBuildResult.metafile) {
    throw new Error("show-html 构建结果缺少 metafile");
  }
  if (shouldRunObfuscation(showHtmlBuildResult.metafile, options)) {
    await obfuscateFile(showHtmlBundlePath);
  }

  const offscreenBundlePath = path.join(outputPublicDir, "offscreen.bundle.js");
  ensureFlattenTarget(offscreenBundlePath, "build:offscreen.bundle.js");
  const offscreenBuildResult = await build({
    bundle: true,
    entryPoints: [offscreenEntryPoint],
    format: "iife",
    legalComments: "none",
    metafile: true,
    minify: true,
    outfile: offscreenBundlePath,
    platform: "browser",
    target: "esnext",
    loader,
  });
  if (!offscreenBuildResult.metafile) {
    throw new Error("offscreen 构建结果缺少 metafile");
  }
  if (shouldRunObfuscation(offscreenBuildResult.metafile, options)) {
    await obfuscateFile(offscreenBundlePath);
  }

  const contentBundlePath = path.join(outputPublicDir, "content.bundle.js");
  ensureFlattenTarget(contentBundlePath, "build:content.bundle.js");
  const contentBuildResult = await build({
    bundle: true,
    entryPoints: [contentEntryPoint],
    format: "iife",
    legalComments: "none",
    metafile: true,
    minify: true,
    outfile: contentBundlePath,
    platform: "browser",
    target: "esnext",
    loader,
    plugins: [toolIndexPlugin],
  });
  if (!contentBuildResult.metafile) {
    throw new Error("content 构建结果缺少 metafile");
  }
  if (shouldRunObfuscation(contentBuildResult.metafile, options)) {
    await obfuscateFile(contentBundlePath);
  }

  const sandboxBundlePath = path.join(outputPublicDir, "sandbox.bundle.js");
  ensureFlattenTarget(sandboxBundlePath, "build:sandbox.bundle.js");
  const sandboxBuildResult = await build({
    bundle: true,
    entryPoints: [sandboxEntryPoint],
    format: "iife",
    legalComments: "none",
    metafile: true,
    minify: true,
    outfile: sandboxBundlePath,
    platform: "browser",
    target: "esnext",
    loader,
  });
  if (!sandboxBuildResult.metafile) {
    throw new Error("sandbox 构建结果缺少 metafile");
  }
  if (shouldRunObfuscation(sandboxBuildResult.metafile, options)) {
    await obfuscateFile(sandboxBundlePath);
  }

  const backgroundBundlePath = path.join(outputRoot, "background.js");
  const backgroundBuildResult = await build({
    bundle: true,
    entryPoints: [backgroundEntryPoint],
    format: "esm",
    legalComments: "none",
    metafile: true,
    minify: true,
    outfile: backgroundBundlePath,
    platform: "browser",
    target: "esnext",
    loader,
  });
  if (!backgroundBuildResult.metafile) {
    throw new Error("background 构建结果缺少 metafile");
  }
  if (shouldRunObfuscation(backgroundBuildResult.metafile, options)) {
    await obfuscateFile(backgroundBundlePath);
  }
};
