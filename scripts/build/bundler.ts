import { build } from "esbuild";
import path from "node:path";
import { outputPublicDir, outputRoot, rootDir } from "./constants.js";
import { ensureFlattenTarget, resolveEntryPath } from "./utils.js";
import { obfuscateFile, shouldObfuscateBuild } from "./obfuscate.js";
import { getToolIndexPlugin } from "./tools.js";

export const buildBundles = async (): Promise<void> => {
  const toolIndexPlugin = await getToolIndexPlugin();

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
};
