import {
  assignChunkAnchors,
  assignLlmIds,
  insertViewportMarker,
} from "../dom/index.js";
import { parseRequiredPositiveInteger } from "../../shared/index.ts";

type BodyHandler<T> = (body: HTMLBodyElement) => T;
type WithPreparedBodyOptions = {
  includeViewportMarker?: boolean;
  tabId: number;
};

const withPreparedBody = <T>(
  handler: BodyHandler<T>,
  options: WithPreparedBodyOptions,
): T => {
  const body = document.querySelector("body");
  if (!(body instanceof HTMLBodyElement)) {
    throw new Error("页面没有可用的 body");
  }
  const tabId = parseRequiredPositiveInteger(options.tabId, "tabId");
  const includeViewportMarker = options.includeViewportMarker === true;
  let marker: HTMLSpanElement | null = null;
  try {
    if (includeViewportMarker) {
      marker = insertViewportMarker(body);
    }
    assignChunkAnchors(body);
    assignLlmIds(body, tabId);
    return handler(body);
  } finally {
    marker?.remove();
  }
};

export default withPreparedBody;
