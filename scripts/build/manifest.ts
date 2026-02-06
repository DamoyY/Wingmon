import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import {
  ensureString,
  isRecord,
  type GuardRecord,
  type GuardValue,
} from "./utils.ts";
import { outputRoot, rootDir } from "./constants.ts";

type Manifest = GuardRecord;

const flattenManifestPath = (value: string): string =>
  value.replaceAll("public/icons/", "public/");

const normalizeManifestIcons = (icons: GuardRecord): GuardRecord =>
  Object.fromEntries(
    Object.entries(icons).map(([size, iconPath]) => [
      size,
      flattenManifestPath(ensureString(iconPath, `manifest.icons.${size}`)),
    ]),
  );

export const buildManifest = async (): Promise<void> => {
  const manifestPath = path.join(rootDir, "manifest.json");
  const manifestContents = await readFile(manifestPath, "utf8");
  const manifestData = JSON.parse(manifestContents) as GuardValue;
  if (!isRecord(manifestData)) {
    throw new Error("manifest.json 必须是对象");
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
