import { isNodeModulesPath } from "../basekit/index.ts";
import { minifyHtmlContent } from "./minify.ts";
import { obfuscateCode } from "./obfuscate.ts";
import { readFile } from "node:fs/promises";

export type FlatCopyContext = Readonly<{
  sourcePath: string;
  targetPath: string;
  fileName: string;
  extension: string;
}>;

export type FlatCopyAction =
  | Readonly<{ type: "copy" }>
  | Readonly<{ type: "skip" }>
  | Readonly<{ type: "write"; content: string }>;

export type FlatCopyProcessor = (
  context: FlatCopyContext,
) => Promise<FlatCopyAction | null>;

const rewritePublicHtml = (fileName: string, contents: string): string => {
  if (fileName === "sandbox.html") {
    return contents.replaceAll("sandbox/", "");
  }
  if (fileName === "panel.html") {
    return contents.replaceAll("icons/", "");
  }
  return contents;
};

const htmlProcessor: FlatCopyProcessor = async (context) => {
  if (context.extension !== ".html") {
    return null;
  }
  const html = await readFile(context.sourcePath, "utf8");
  const rewrittenHtml = rewritePublicHtml(context.fileName, html);
  const minifiedHtml = await minifyHtmlContent(rewrittenHtml, context.fileName);
  return { content: minifiedHtml, type: "write" };
};

const javaScriptProcessor: FlatCopyProcessor = async (context) => {
  if (context.extension !== ".js") {
    return null;
  }
  if (isNodeModulesPath(context.sourcePath)) {
    return { type: "copy" };
  }
  const source = await readFile(context.sourcePath, "utf8");
  const obfuscated = obfuscateCode(source);
  return { content: obfuscated, type: "write" };
};

export const publicAssetProcessors: readonly FlatCopyProcessor[] = [
  htmlProcessor,
  javaScriptProcessor,
];

export const resolveFlatCopyAction = async (
  context: FlatCopyContext,
  processors: readonly FlatCopyProcessor[],
): Promise<FlatCopyAction> => {
  for (const processor of processors) {
    const action = await processor(context);
    if (action !== null) {
      return action;
    }
  }
  return { type: "copy" };
};
