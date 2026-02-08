import * as sass from "sass";
import {
  ensureFlattenTarget,
  outputPublicDir,
  rootDir,
} from "../basekit/index.ts";
import { minifyCss } from "../transformers/index.ts";
import path from "node:path";
import { writeFile } from "node:fs/promises";

export const buildStyles = async (): Promise<void> => {
  const sassResult = sass.compile(
    path.join(rootDir, "src/sidepanel/styles/sidepanelStyle.scss"),
    {
      loadPaths: [path.join(rootDir, "node_modules")],
      quietDeps: true,
      style: "expanded",
    },
  );

  const panelCssPath = path.join(outputPublicDir, "panel.css");
  const panelCss = sassResult.css.replace(/url\((["']?)fonts\//g, "url($1");
  const minifiedCss = minifyCss(panelCss, "panel.css");
  ensureFlattenTarget(panelCssPath, "build:panel.css");
  await writeFile(panelCssPath, minifiedCss);
};
