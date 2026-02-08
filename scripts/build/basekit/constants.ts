import { fileURLToPath } from "node:url";
import path from "node:path";

export const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
export const outputRoot = path.resolve(rootDir, "..", "dst");
export const outputPublicDir = path.join(outputRoot, "public");
