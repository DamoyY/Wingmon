import path from "node:path";
import { stat } from "node:fs/promises";

type PrimitiveValue = boolean | number | string | null;
export type GuardValue = PrimitiveValue | object;
export type GuardRecord = Record<string, GuardValue>;

export const isRecord = (value: GuardValue): value is GuardRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const nodeModulesPattern = /(^|[\\/])node_modules([\\/]|$)/;

export const isNodeModulesPath = (filePath: string): boolean =>
  nodeModulesPattern.test(path.normalize(filePath));

export const ensureString = (value: GuardValue, context: string): string => {
  if (typeof value !== "string") {
    throw new Error(`${context} 必须是字符串`);
  }
  return value;
};

export const shouldCopyFile = async (
  source: string,
  target: string,
): Promise<boolean> => {
  try {
    const [sourceStat, targetStat] = await Promise.all([
      stat(source),
      stat(target),
    ]);
    return (
      sourceStat.size !== targetStat.size ||
      sourceStat.mtimeMs > targetStat.mtimeMs
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      Reflect.get(error, "code") === "ENOENT"
    ) {
      return true;
    }
    throw error;
  }
};

const flattenTargets = new Map<string, string>();

export const ensureFlattenTarget = (
  targetPath: string,
  sourcePath: string,
): void => {
  const existingSource = flattenTargets.get(targetPath);
  if (existingSource && existingSource !== sourcePath) {
    throw new Error(
      `输出冲突: ${sourcePath} 与 ${existingSource} -> ${targetPath}`,
    );
  }
  flattenTargets.set(targetPath, sourcePath);
};

export const entryExtensions = [".ts", ".tsx", ".js", ".mjs", ".cjs"] as const;

export const resolveEntryPath = async (basePath: string): Promise<string> => {
  for (const extension of entryExtensions) {
    const candidate = `${basePath}${extension}`;
    try {
      await stat(candidate);
      return candidate;
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        Reflect.get(error, "code") !== "ENOENT"
      ) {
        throw error;
      }
    }
  }
  throw new Error(`未找到入口文件: ${basePath}`);
};
