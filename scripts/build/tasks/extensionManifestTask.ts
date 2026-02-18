import {
  type GuardRecord,
  type GuardValue,
  ensureString,
  isRecord,
  outputRoot,
  rootDir,
} from "../basekit/index.ts";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Manifest = GuardRecord;

const normalizeManifestIcons = (icons: GuardRecord): GuardRecord =>
  Object.fromEntries(
    Object.entries(icons).map(([size, iconPath]) => [
      size,
      ensureString(iconPath, `manifest.icons.${size}`),
    ]),
  );

export const buildManifest = async (): Promise<void> => {
  const manifestPath = path.join(rootDir, "src/manifest.json");
  const manifestContents = await readFile(manifestPath, "utf8");
  const manifestData = JSON.parse(manifestContents) as GuardValue;
  if (!isRecord(manifestData)) {
    throw new Error("src/manifest.json 必须是对象");
  }
  const manifest: Manifest = manifestData;
  const hasBackground = Object.hasOwn(manifest, "background");
  if (hasBackground && !isRecord(manifest.background)) {
    throw new Error("manifest.background 必须是对象");
  }
  const existingBackground =
    hasBackground && isRecord(manifest.background) ? manifest.background : {};
  manifest.background = {
    ...existingBackground,
    service_worker: "background.js",
  };
  const hasIcons = Object.hasOwn(manifest, "icons");
  if (hasIcons && !isRecord(manifest.icons)) {
    throw new Error("manifest.icons 必须是对象");
  }
  if (hasIcons && isRecord(manifest.icons)) {
    manifest.icons = normalizeManifestIcons(manifest.icons);
  }

  await writeFile(
    path.join(outputRoot, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
};
