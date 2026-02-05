import { build } from "esbuild";
import path from "node:path";
import { outputPublicDir, outputRoot, rootDir } from "./constants.ts";
import { ensureFlattenTarget, resolveEntryPath } from "./utils.ts";
import { obfuscateFile, shouldObfuscateBuild } from "./obfuscate.ts";
import { getToolIndexPlugin } from "./tools.ts";

export const buildBundles = async (): Promise<void> => {
  const toolIndexPlugin = await getToolIndexPlugin();
  const loader = { ".md": "text", ".wasm": "binary" };

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
  const sandboxEntryPoint = await resolveEntryPath(
    path.join(rootDir, "public/sandbox/index"),
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
  if (shouldObfuscateBuild(backgroundBuildResult.metafile)) {
    await obfuscateFile(backgroundBundlePath);
  }
};
