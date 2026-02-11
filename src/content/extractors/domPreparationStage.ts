import {
  insertChunkAnchorMarkers,
  markViewportCenter,
} from "./controlMarkers.ts";
import type { PageContentData } from "./pageContentContracts.ts";
import { clearHiddenElementsForMarkdown } from "../dom/visibility.js";
import { cloneBodyWithShadowDom } from "./shadowDom.ts";
import replaceButtons from "./buttons.js";
import replaceInputs from "./inputs.js";

export type PreparedDomStage = {
  locateViewportCenter: boolean;
  markerToken: string | null;
  sourceBody: HTMLElement;
  transformedBody: HTMLElement;
};

const llmDataAttributePrefix = "data-llm-";

const removeTablesWithoutRows = (root: Element): void => {
  const tables = Array.from(root.getElementsByTagName("table"));
  tables.forEach((table) => {
    if (table.rows.length > 0) {
      return;
    }
    table.remove();
  });
};

const removeInternalLlmDataAttributes = (root: Element): void => {
  const elements = [root, ...Array.from(root.querySelectorAll("*"))];
  elements.forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      if (attribute.name.startsWith(llmDataAttributePrefix)) {
        element.removeAttribute(attribute.name);
      }
    });
  });
};

const resolvePageBodyOrThrow = (pageData: PageContentData): HTMLElement => {
  const { body } = pageData;
  if (!(body instanceof HTMLElement)) {
    throw new Error("页面内容为空");
  }
  return body;
};

const prepareDomStage = (pageData: PageContentData): PreparedDomStage => {
  const sourceBody = resolvePageBodyOrThrow(pageData);
  const transformedBody = (() => {
    try {
      return cloneBodyWithShadowDom(sourceBody);
    } finally {
      clearHiddenElementsForMarkdown(sourceBody);
    }
  })();
  removeTablesWithoutRows(transformedBody);
  replaceButtons(transformedBody);
  replaceInputs(transformedBody);
  insertChunkAnchorMarkers(transformedBody);
  const locateViewportCenter = pageData.locateViewportCenter;
  const markerToken = locateViewportCenter
    ? markViewportCenter(transformedBody)
    : null;
  removeInternalLlmDataAttributes(transformedBody);
  return {
    locateViewportCenter,
    markerToken,
    sourceBody,
    transformedBody,
  };
};

export { prepareDomStage };
