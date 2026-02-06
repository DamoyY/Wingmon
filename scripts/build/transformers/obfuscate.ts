import JavaScriptObfuscator from "javascript-obfuscator";
import { readFile, writeFile } from "node:fs/promises";
import type { Metafile } from "esbuild";
import { isNodeModulesPath } from "../core/index.ts";

type ObfuscatorOptions = Parameters<typeof JavaScriptObfuscator.obfuscate>[1];

export const obfuscatorOptions: ObfuscatorOptions = {
  controlFlowFlattening: false,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 1,
  debugProtection: false,
  compact: true,
  identifierNamesGenerator: "hexadecimal",
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayCallsTransform: false,
  stringArrayEncoding: ["base64"],
  stringArrayRotate: true,
  stringArrayIndexShift: true,
  stringArrayShuffle: true,
  stringArrayThreshold: 0.75,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersType: "variable",
  transformObjectKeys: false,
  unicodeEscapeSequence: true,
};

export const shouldObfuscateBuild = (metafile: Metafile): boolean => {
  return !Object.keys(metafile.inputs).some((input) =>
    isNodeModulesPath(input),
  );
};

export const obfuscateCode = (source: string): string => {
  const result = JavaScriptObfuscator.obfuscate(source, obfuscatorOptions);
  return result.getObfuscatedCode();
};

export const obfuscateFile = async (filePath: string): Promise<void> => {
  const source = await readFile(filePath, "utf8");
  const obfuscated = obfuscateCode(source);
  await writeFile(filePath, obfuscated);
};
