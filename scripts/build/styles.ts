import * as sass from "sass";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { outputPublicDir, rootDir } from "./constants.ts";
import { minifyCss } from "./minify.ts";
import { ensureFlattenTarget } from "./utils.ts";

export const buildStyles = async (): Promise<void> => {
  const sassResult = sass.compile(
    path.join(rootDir, "src/panel/styles/panel.scss"),
    {
      loadPaths: [path.join(rootDir, "node_modules")],
      style: "expanded",
      quietDeps: true,
    },
  );

  const panelCssPath = path.join(outputPublicDir, "panel.css");
  const panelCss = sassResult.css.replace(/url\((["']?)fonts\//g, "url($1");
  const minifiedCss = minifyCss(panelCss, "panel.css");
  ensureFlattenTarget(panelCssPath, "build:panel.css");
  await writeFile(panelCssPath, minifiedCss);
};
