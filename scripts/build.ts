import {
  buildBundles,
  buildManifest,
  buildPolicyWebsite,
  buildStyles,
  copyAssets,
  outputRoot,
} from "./build/index.ts";
import { mkdir, rm } from "node:fs/promises";
import { parseBuildCliOptions } from "./build/cliOptions.ts";

const cliOptions = parseBuildCliOptions(process.argv.slice(2));

await rm(outputRoot, { force: true, recursive: true });
await mkdir(outputRoot, { recursive: true });

await buildManifest();
await copyAssets();
await buildStyles();
await buildBundles(cliOptions);
await buildPolicyWebsite();
