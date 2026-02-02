import { mkdir } from "node:fs/promises";
import { copyAssets } from "./build/assets.ts";
import { buildBundles } from "./build/bundler.ts";
import { outputPublicDir, outputRoot } from "./build/constants.ts";
import { buildManifest } from "./build/manifest.ts";
import { buildStyles } from "./build/styles.ts";

await mkdir(outputRoot, { recursive: true });
await mkdir(outputPublicDir, { recursive: true });

await buildManifest();
await copyAssets();
await buildStyles();
await buildBundles();
