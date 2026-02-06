import { build } from "esbuild";
import path from "node:path";
import {
  ensureFlattenTarget,
  outputPublicDir,
  outputRoot,
  resolveEntryPath,
  rootDir,
} from "../core/index.ts";
import { obfuscateFile, shouldObfuscateBuild } from "../transformers/index.ts";
import { getToolIndexPlugin } from "../plugins/index.ts";

export const buildBundles = async (): Promise<void> => {
  const toolIndexPlugin = await getToolIndexPlugin();
  const loader = { ".md": "text", ".wasm": "binary" };

  const panelEntryPoint = await resolveEntryPath(
    path.join(rootDir, "src/sidepanel/index"),
  );
  const showHtmlEntryPoint = await resolveEntryPath(
    path.join(rootDir, "src/sidepanel/pages/show-html/index"),
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
    entryPoints: [panelEntryPoint],
    bundle: true,
    format: "iife",
    minify: true,
    platform: "browser",
    target: "esnext",
    outfile: panelBundlePath,
    legalComments: "none",
    metafile: true,
    loader,
    plugins: [toolIndexPlugin],
  });
  if (!panelBuildResult.metafile) {
    throw new Error("panel 构建结果缺少 metafile");
  }
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
    loader,
    plugins: [toolIndexPlugin],
  });
  if (!showHtmlBuildResult.metafile) {
    throw new Error("show-html 构建结果缺少 metafile");
  }
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
    loader,
    plugins: [toolIndexPlugin],
  });
  if (!contentBuildResult.metafile) {
    throw new Error("content 构建结果缺少 metafile");
  }
  if (shouldObfuscateBuild(contentBuildResult.metafile)) {
    await obfuscateFile(contentBundlePath);
  }

  const sandboxBundlePath = path.join(outputPublicDir, "sandbox.bundle.js");
  ensureFlattenTarget(sandboxBundlePath, "build:sandbox.bundle.js");
  const sandboxBuildResult = await build({
    entryPoints: [sandboxEntryPoint],
    bundle: true,
    format: "iife",
    minify: true,
    platform: "browser",
    target: "esnext",
    outfile: sandboxBundlePath,
    legalComments: "none",
    metafile: true,
    loader,
  });
  if (!sandboxBuildResult.metafile) {
    throw new Error("sandbox 构建结果缺少 metafile");
  }
  if (shouldObfuscateBuild(sandboxBuildResult.metafile)) {
    await obfuscateFile(sandboxBundlePath);
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
    loader,
  });
  if (!backgroundBuildResult.metafile) {
    throw new Error("background 构建结果缺少 metafile");
  }
  if (shouldObfuscateBuild(backgroundBuildResult.metafile)) {
    await obfuscateFile(backgroundBundlePath);
  }
};
