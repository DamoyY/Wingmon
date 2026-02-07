import {
  assignChunkAnchors,
  assignLlmIds,
  insertViewportMarker,
} from "../dom/index.js";

type BodyHandler<T> = (body: HTMLBodyElement) => T;

const withPreparedBody = <T>(handler: BodyHandler<T>): T => {
  const body = document.querySelector("body");
  if (!(body instanceof HTMLBodyElement)) {
    throw new Error("页面没有可用的 body");
  }
  let marker: HTMLSpanElement | null = null;
  try {
    marker = insertViewportMarker(body);
    assignChunkAnchors(body);
    assignLlmIds(body);
    return handler(body);
  } finally {
    marker?.remove();
  }
};

export default withPreparedBody;
