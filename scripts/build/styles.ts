import * as sass from "sass";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { outputPublicDir, rootDir } from "./constants.js";
import { ensureFlattenTarget } from "./utils.js";

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
  ensureFlattenTarget(panelCssPath, "build:panel.css");
  await writeFile(panelCssPath, panelCss);
};
