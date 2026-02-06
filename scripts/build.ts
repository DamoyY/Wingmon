import { mkdir } from "node:fs/promises";
import {
  buildBundles,
  buildManifest,
  buildStyles,
  copyAssets,
  outputPublicDir,
  outputRoot,
} from "./build/index.ts";

await mkdir(outputRoot, { recursive: true });
await mkdir(outputPublicDir, { recursive: true });

await buildManifest();
await copyAssets();
await buildStyles();
await buildBundles();
