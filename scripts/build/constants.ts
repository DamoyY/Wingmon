import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const outputRoot = path.resolve(rootDir, "..", "dst");
export const outputPublicDir = path.join(outputRoot, "public");
