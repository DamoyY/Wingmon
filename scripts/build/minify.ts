import CleanCSS from "clean-css";
import { minify as minifyHtml } from "html-minifier-terser";

const logIssues = (
  issues: string[],
  context: string,
  level: "error" | "warn",
): void => {
  for (const issue of issues) {
    console[level](`[build:minify] ${context}: ${issue}`);
  }
};

export const minifyCss = (source: string, context: string): string => {
  const result = new CleanCSS({ level: 2 }).minify(source);
  if (result.warnings.length > 0) {
    logIssues(result.warnings, context, "warn");
  }
  if (result.errors.length > 0) {
    logIssues(result.errors, context, "error");
    throw new Error(`${context} CSS 压缩失败`);
  }
  return result.styles;
};

export const minifyHtmlContent = async (
  source: string,
  context: string,
): Promise<string> => {
  try {
    return await minifyHtml(source, {
      collapseWhitespace: true,
      conservativeCollapse: true,
      removeComments: true,
      removeRedundantAttributes: true,
    });
  } catch (error) {
    console.error(`[build:minify] ${context} HTML 压缩失败`, error);
    throw error;
  }
};
