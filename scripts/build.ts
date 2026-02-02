import { mkdir } from "node:fs/promises";
import { copyAssets } from "./build/assets.js";
import { buildBundles } from "./build/bundler.js";
import { outputPublicDir, outputRoot } from "./build/constants.js";
import { buildManifest } from "./build/manifest.js";
import { buildStyles } from "./build/styles.js";

await mkdir(outputRoot, { recursive: true });
await mkdir(outputPublicDir, { recursive: true });

await buildManifest();
await copyAssets();
await buildStyles();
await buildBundles();
