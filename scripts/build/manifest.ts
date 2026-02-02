import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { ensureString, isRecord } from "./utils.ts";
import { outputRoot, rootDir } from "./constants.ts";

type Manifest = {
  background?: Record<string, unknown>;
  icons?: Record<string, unknown>;
} & Record<string, unknown>;

const flattenManifestPath = (value: string): string =>
  value.replaceAll("public/icons/", "public/");

const normalizeManifestIcons = (
  icons: Record<string, unknown>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(icons).map(([size, iconPath]) => [
      size,
      flattenManifestPath(ensureString(iconPath, `manifest.icons.${size}`)),
    ]),
  );

export const buildManifest = async (): Promise<void> => {
  const manifestPath = path.join(rootDir, "manifest.json");
  const manifestContents = await readFile(manifestPath, "utf8");
  const manifestData: unknown = JSON.parse(manifestContents);
  if (!isRecord(manifestData)) {
    throw new Error("manifest.json 必须是对象");
  }
  const manifest: Manifest = manifestData;
  if (manifest.background !== undefined && !isRecord(manifest.background)) {
    throw new Error("manifest.background 必须是对象");
  }
  const existingBackground = isRecord(manifest.background)
    ? manifest.background
    : {};
  manifest.background = {
    ...existingBackground,
    service_worker: "background.js",
  };
  if (manifest.icons !== undefined) {
    if (!isRecord(manifest.icons)) {
      throw new Error("manifest.icons 必须是对象");
    }
    manifest.icons = normalizeManifestIcons(manifest.icons);
  }

  await writeFile(
    path.join(outputRoot, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
};
