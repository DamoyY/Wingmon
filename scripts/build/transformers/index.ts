export { minifyCss, minifyHtmlContent } from "./minify.ts";
export {
  obfuscateCode,
  obfuscateFile,
  obfuscatorOptions,
  shouldObfuscateBuild,
} from "./obfuscate.ts";
export {
  publicAssetProcessors,
  resolveFlatCopyAction,
  type FlatCopyAction,
  type FlatCopyContext,
  type FlatCopyProcessor,
} from "./assetProcessors.ts";
