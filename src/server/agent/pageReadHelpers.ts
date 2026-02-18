import {
  type ButtonChunkPage,
  type ChunkAnchorWeight,
  type GetPageContentRequest,
  type GetPageContentSuccessResponse,
  type InputChunkPage,
  type SetPageHashRequest,
  type SupportedImageMimeType,
  resolveSupportedImageMimeType,
  resolveSupportedImageMimeTypeFromContentType,
  t,
} from "../../shared/index.ts";
import {
  getSettings,
  getTabNavigationFailure,
  reloadTab,
  sendMessageToTab,
  waitForContentScript,
} from "../services/index.ts";
import {
  parseOptionalPositiveInteger,
  parseOptionalPositiveNumber,
} from "./validation/index.js";
import type { ToolImageInput } from "./toolResultTypes.ts";

type PageReadResultArgs = {
  content: string;
  contentLabel: string;
  headerLines: string[];
  isInternal: boolean;
};

export type PageReadMetadata = {
  chunkAnchorWeights?: ChunkAnchorWeight[];
  pageNumber: number;
  totalPages: number;
  viewportPage: number;
};

export type PageMarkdownData = PageReadMetadata & {
  content: string;
  title: string;
  url: string;
};

export type ButtonTabChunkLocation = {
  pageNumber: number;
  tabId: number;
};

export type InputTabChunkLocation = {
  pageNumber: number;
  tabId: number;
};

type FetchPageMarkdownDataOptions = {
  locateViewportCenter?: boolean;
};

type ResolvePageImageInputOptions = {
  allowRemoteContentTypeProbe?: boolean;
};

type PageReadMetadataInput = {
  chunkAnchorWeights?: readonly ChunkAnchorWeight[];
  pageNumber?: number;
  totalPages?: number;
  viewportPage?: number;
};

const pageContentRetryBaseDelayMs = 200,
  contentScriptMissingReceiverPattern = /Receiving end does not exist/u,
  pageContentRetryTimeoutMs = 10000,
  chunkAnchorIdPattern = /^[a-z0-9]+$/u,
  resolvePageContentRetryDelay = (attempt: number) =>
    pageContentRetryBaseDelayMs * 2 ** attempt,
  waitForDelay = (delayMs: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });

const buttonControlMarkerPattern =
  /<< Button \| text: `[\s\S]*?` \| id: `([0-9a-z]+)` >>/gu;
const inputControlMarkerPattern =
  /<< Input \| text: `[\s\S]*?` \| id: `([0-9a-z]+)` >>/gu;

const buttonTabChunkLocationByButtonId: Map<string, ButtonTabChunkLocation> =
  new Map();
const buttonIdsByTabId: Map<number, Set<string>> = new Map();
const inputTabChunkLocationByInputId: Map<string, InputTabChunkLocation> =
  new Map();
const inputIdsByTabId: Map<number, Set<string>> = new Map();

const imageBase64ChunkSize = 8192,
  resolveImageMimeTypeFromResponse = (
    response: Response,
  ): SupportedImageMimeType | null =>
    resolveSupportedImageMimeTypeFromContentType(
      response.headers.get("content-type"),
    ),
  cancelResponseBody = async (response: Response): Promise<void> => {
    if (response.body === null) {
      return;
    }
    try {
      await response.body.cancel();
    } catch (error) {
      console.error("取消图片探测响应体失败", error);
    }
  },
  probeRemoteImageMimeType = async (
    url: string,
  ): Promise<SupportedImageMimeType | null> => {
    try {
      const headResponse = await fetch(url, {
          method: "HEAD",
          redirect: "follow",
        }),
        headMimeType = resolveImageMimeTypeFromResponse(headResponse);
      if (headMimeType !== null) {
        return headMimeType;
      }
      if (!headResponse.ok) {
        console.warn("图片 MIME 探测 HEAD 请求状态异常", {
          status: headResponse.status,
          url,
        });
      }
    } catch (error) {
      console.warn("图片 MIME 探测 HEAD 请求失败", { url }, error);
    }
    try {
      const getResponse = await fetch(url, {
          method: "GET",
          redirect: "follow",
        }),
        getMimeType = resolveImageMimeTypeFromResponse(getResponse);
      await cancelResponseBody(getResponse);
      if (getMimeType !== null) {
        return getMimeType;
      }
      if (!getResponse.ok) {
        console.warn("图片 MIME 探测 GET 请求状态异常", {
          status: getResponse.status,
          url,
        });
        return null;
      }
      console.warn("图片 MIME 探测未命中支持的 Content-Type", {
        contentType: getResponse.headers.get("content-type"),
        url,
      });
      return null;
    } catch (error) {
      console.warn("图片 MIME 探测 GET 请求失败", { url }, error);
      return null;
    }
  },
  resolveSingleMarkdownImageUrl = (markdown: string): string | null => {
    const trimmed = markdown.trim(),
      match = /^!\[[^\]\r\n]*\]\((.+)\)$/u.exec(trimmed);
    if (!match) {
      return null;
    }
    const destination = (match[1] || "").trim();
    if (!destination) {
      return null;
    }
    if (destination.startsWith("<") && destination.endsWith(">")) {
      const wrappedUrl = destination.slice(1, -1).trim();
      return wrappedUrl || null;
    }
    const firstSpaceIndex = destination.search(/\s/u);
    if (firstSpaceIndex === -1) {
      return destination;
    }
    const url = destination.slice(0, firstSpaceIndex).trim();
    return url || null;
  },
  resolveMarkdownImageUrl = (
    markdown: string,
    baseUrl: string,
  ): string | null => {
    const relativeUrl = resolveSingleMarkdownImageUrl(markdown);
    if (relativeUrl === null) {
      return null;
    }
    try {
      return new URL(relativeUrl, baseUrl).toString();
    } catch (error) {
      console.error(
        "Markdown 图片 URL 解析失败",
        { baseUrl, relativeUrl },
        error,
      );
      return null;
    }
  },
  decodeDataUrlBase64 = (url: string): string => {
    const commaIndex = url.indexOf(",");
    if (commaIndex < 0) {
      throw new Error("Data URL 缺少逗号分隔符");
    }
    const header = url.slice(0, commaIndex).toLowerCase(),
      payload = url.slice(commaIndex + 1).trim();
    if (!header.includes(";base64")) {
      throw new Error("Data URL 不是 Base64 编码");
    }
    if (!payload) {
      throw new Error("Data URL Base64 内容为空");
    }
    return payload;
  },
  encodeBytesToBase64 = (bytes: Uint8Array): string => {
    if (bytes.byteLength === 0) {
      throw new Error("图片数据为空");
    }
    let binary = "";
    for (
      let offset = 0;
      offset < bytes.byteLength;
      offset += imageBase64ChunkSize
    ) {
      const chunk = bytes.subarray(offset, offset + imageBase64ChunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary).trim();
    if (!base64) {
      throw new Error("图片 Base64 编码结果为空");
    }
    return base64;
  },
  readImageBase64FromFileUrl = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${String(response.status)}`);
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      return encodeBytesToBase64(bytes);
    } catch (error) {
      console.error("读取 file:// 图片失败", { url }, error);
      throw new Error("读取 file:// 图片失败");
    }
  };

const parseChunkAnchorWeightItem = (
    item: ChunkAnchorWeight,
    fieldName: string,
    index: number,
  ): ChunkAnchorWeight => {
    if (typeof item.id !== "string") {
      throw new Error(`${fieldName}[${String(index)}].id 必须是字符串`);
    }
    const id = item.id.trim().toLowerCase();
    if (!id || !chunkAnchorIdPattern.test(id)) {
      throw new Error(
        `${fieldName}[${String(index)}].id 必须是非空字母数字字符串`,
      );
    }
    const weight = parseOptionalPositiveInteger(
      item.weight,
      `${fieldName}[${String(index)}].weight`,
    );
    if (weight === undefined) {
      throw new Error(`${fieldName}[${String(index)}].weight 必须是正整数`);
    }
    return {
      id,
      weight,
    };
  },
  parseOptionalChunkAnchorWeights = (
    value: readonly ChunkAnchorWeight[] | undefined,
    fieldName: string,
  ): ChunkAnchorWeight[] | undefined => {
    if (value === undefined) {
      return undefined;
    }
    const usedIds = new Set<string>();
    const chunkAnchorWeights = value.map((item, index) =>
      parseChunkAnchorWeightItem(item, fieldName, index),
    );
    chunkAnchorWeights.forEach((chunkAnchorWeight) => {
      if (usedIds.has(chunkAnchorWeight.id)) {
        throw new Error(`${fieldName} 存在重复 id：${chunkAnchorWeight.id}`);
      }
      usedIds.add(chunkAnchorWeight.id);
    });
    return chunkAnchorWeights;
  },
  ensurePageInRange = (
    value: number,
    fieldName: string,
    totalPages: number,
  ): number => {
    if (value > totalPages) {
      throw new Error(
        `${fieldName} 超出范围：${String(value)} > ${String(totalPages)}`,
      );
    }
    return value;
  },
  normalizePageReadFailure = (error: unknown): Error => {
    if (error instanceof Error) {
      return error;
    }
    return new Error("页面内容获取失败");
  },
  resolvePageNumber = (value?: number): number =>
    parseOptionalPositiveInteger(value, "pageNumber") ?? 1,
  resolvePageMetadata = (
    meta: PageReadMetadataInput,
    fallbackPageNumber?: number,
  ): PageReadMetadata => {
    const normalizedPageNumber =
        parseOptionalPositiveInteger(meta.pageNumber, "pageNumber") ??
        resolvePageNumber(fallbackPageNumber),
      totalPages =
        parseOptionalPositiveInteger(meta.totalPages, "totalPages") ??
        normalizedPageNumber,
      pageNumber = ensurePageInRange(
        normalizedPageNumber,
        "pageNumber",
        totalPages,
      ),
      viewportPage = ensurePageInRange(
        parseOptionalPositiveNumber(meta.viewportPage, "viewportPage") ??
          pageNumber,
        "viewportPage",
        totalPages,
      ),
      chunkAnchorWeights = parseOptionalChunkAnchorWeights(
        meta.chunkAnchorWeights,
        "chunkAnchorWeights",
      );
    return {
      chunkAnchorWeights,
      pageNumber,
      totalPages,
      viewportPage,
    };
  };

type ControlChunkPage = {
  id: string;
  pageNumber: number;
};

type ControlChunkIndexState = {
  idsByTabId: Map<number, Set<string>>;
  locationById: Map<string, { pageNumber: number; tabId: number }>;
  markerPattern: RegExp;
  name: string;
};

const resolveControlChunkPageItem = (
  item: ControlChunkPage,
  fieldName: string,
  index: number,
): ControlChunkPage => {
  if (typeof item.id !== "string") {
    throw new Error(`${fieldName}[${String(index)}].id 必须是字符串`);
  }
  const id = item.id.trim().toLowerCase();
  if (!id || !chunkAnchorIdPattern.test(id)) {
    throw new Error(
      `${fieldName}[${String(index)}].id 必须是非空字母数字字符串`,
    );
  }
  const pageNumber = parseOptionalPositiveInteger(
    item.pageNumber,
    `${fieldName}[${String(index)}].pageNumber`,
  );
  if (pageNumber === undefined) {
    throw new Error(`${fieldName}[${String(index)}].pageNumber 必须是正整数`);
  }
  return {
    id,
    pageNumber,
  };
};

const parseOptionalControlChunkPages = (
  value: readonly ControlChunkPage[] | undefined,
  fieldName: string,
): ControlChunkPage[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const usedIds = new Set<string>();
  const controlChunkPages = value.map((item, index) =>
    resolveControlChunkPageItem(item, fieldName, index),
  );
  controlChunkPages.forEach((controlChunkPage) => {
    if (usedIds.has(controlChunkPage.id)) {
      throw new Error(`${fieldName} 存在重复 id：${controlChunkPage.id}`);
    }
    usedIds.add(controlChunkPage.id);
  });
  return controlChunkPages;
};

const extractControlChunkPagesFromContent = (
  content: string,
  pageNumber: number,
  state: Pick<ControlChunkIndexState, "markerPattern" | "name">,
): ControlChunkPage[] => {
  const normalizedPageNumber = parseOptionalPositiveInteger(
    pageNumber,
    "pageNumber",
  );
  if (normalizedPageNumber === undefined) {
    throw new Error("pageNumber 必须是正整数");
  }
  const ids = new Set<string>();
  const controlChunkPages: ControlChunkPage[] = [];
  state.markerPattern.lastIndex = 0;
  let markerMatch = state.markerPattern.exec(content);
  while (markerMatch) {
    const markerId = markerMatch[1];
    if (typeof markerId !== "string") {
      throw new Error(`${state.name}标记缺少 id`);
    }
    const normalizedId = markerId.trim().toLowerCase();
    if (!normalizedId || !chunkAnchorIdPattern.test(normalizedId)) {
      throw new Error(`${state.name}标记 id 无效：${markerId}`);
    }
    if (!ids.has(normalizedId)) {
      ids.add(normalizedId);
      controlChunkPages.push({
        id: normalizedId,
        pageNumber: normalizedPageNumber,
      });
    }
    markerMatch = state.markerPattern.exec(content);
  }
  return controlChunkPages;
};

const clearControlChunkIndexForTab = (
  tabId: number,
  state: Pick<ControlChunkIndexState, "idsByTabId" | "locationById">,
): void => {
  const ids = state.idsByTabId.get(tabId);
  if (!ids) {
    return;
  }
  ids.forEach((id) => {
    const location = state.locationById.get(id);
    if (!location) {
      return;
    }
    if (location.tabId === tabId) {
      state.locationById.delete(id);
    }
  });
  state.idsByTabId.delete(tabId);
};

const updateControlChunkIndexForTab = (
  tabId: number,
  controlChunkPages: readonly ControlChunkPage[],
  state: Pick<ControlChunkIndexState, "idsByTabId" | "locationById" | "name">,
): void => {
  if (!Number.isInteger(tabId) || tabId <= 0) {
    throw new Error("tabId 必须是正整数");
  }
  const nextLocations = controlChunkPages.map((controlChunkPage) => {
    if (
      !Number.isInteger(controlChunkPage.pageNumber) ||
      controlChunkPage.pageNumber <= 0
    ) {
      throw new Error("controlChunkPages.pageNumber 必须是正整数");
    }
    const existingLocation = state.locationById.get(controlChunkPage.id);
    if (existingLocation !== undefined && existingLocation.tabId !== tabId) {
      throw new Error(`${state.name}索引冲突：id=${controlChunkPage.id}`);
    }
    return {
      id: controlChunkPage.id,
      pageNumber: controlChunkPage.pageNumber,
    };
  });
  clearControlChunkIndexForTab(tabId, state);
  const ids = new Set<string>();
  nextLocations.forEach((nextLocation) => {
    state.locationById.set(nextLocation.id, {
      pageNumber: nextLocation.pageNumber,
      tabId,
    });
    ids.add(nextLocation.id);
  });
  if (!ids.size) {
    return;
  }
  state.idsByTabId.set(tabId, ids);
};

const resolveControlChunkPages = (
  controlChunkPages: readonly ControlChunkPage[] | undefined,
  content: string,
  metadata: PageReadMetadata,
  fieldName: string,
  state: Pick<ControlChunkIndexState, "markerPattern" | "name">,
): ControlChunkPage[] => {
  const parsedControlChunkPages = parseOptionalControlChunkPages(
    controlChunkPages,
    fieldName,
  );
  const resolvedControlChunkPages =
    parsedControlChunkPages ??
    extractControlChunkPagesFromContent(content, metadata.pageNumber, state);
  return resolvedControlChunkPages.map((controlChunkPage, index) => ({
    id: controlChunkPage.id,
    pageNumber: ensurePageInRange(
      controlChunkPage.pageNumber,
      `${fieldName}[${String(index)}].pageNumber`,
      metadata.totalPages,
    ),
  }));
};

const resolveControlTabChunkLocation = (
  id: string,
  state: Pick<ControlChunkIndexState, "locationById" | "name">,
): { pageNumber: number; tabId: number } | null => {
  const normalizedId = id.trim().toLowerCase();
  if (!normalizedId || !chunkAnchorIdPattern.test(normalizedId)) {
    throw new Error(`${state.name} id 必须是非空字母数字字符串`);
  }
  const location = state.locationById.get(normalizedId);
  if (!location) {
    return null;
  }
  if (!Number.isInteger(location.tabId) || location.tabId <= 0) {
    throw new Error(`${state.name}标签页记录 tabId 无效`);
  }
  if (!Number.isInteger(location.pageNumber) || location.pageNumber <= 0) {
    throw new Error(`${state.name}标签页记录 pageNumber 无效`);
  }
  return {
    pageNumber: location.pageNumber,
    tabId: location.tabId,
  };
};

const buttonChunkIndexState: ControlChunkIndexState = {
  idsByTabId: buttonIdsByTabId,
  locationById: buttonTabChunkLocationByButtonId,
  markerPattern: buttonControlMarkerPattern,
  name: "按钮",
};

const inputChunkIndexState: ControlChunkIndexState = {
  idsByTabId: inputIdsByTabId,
  locationById: inputTabChunkLocationByInputId,
  markerPattern: inputControlMarkerPattern,
  name: "输入框",
};

const resolveButtonChunkPages = (
  pageData: GetPageContentSuccessResponse,
  metadata: PageReadMetadata,
): ButtonChunkPage[] =>
  resolveControlChunkPages(
    pageData.buttonChunkPages,
    pageData.content,
    metadata,
    "buttonChunkPages",
    buttonChunkIndexState,
  );

const resolveInputChunkPages = (
  pageData: GetPageContentSuccessResponse,
  metadata: PageReadMetadata,
): InputChunkPage[] =>
  resolveControlChunkPages(
    pageData.inputChunkPages,
    pageData.content,
    metadata,
    "inputChunkPages",
    inputChunkIndexState,
  );

const updateButtonChunkIndexForTab = (
  tabId: number,
  buttonChunkPages: readonly ButtonChunkPage[],
): void => {
  updateControlChunkIndexForTab(tabId, buttonChunkPages, buttonChunkIndexState);
};

const updateInputChunkIndexForTab = (
  tabId: number,
  inputChunkPages: readonly InputChunkPage[],
): void => {
  updateControlChunkIndexForTab(tabId, inputChunkPages, inputChunkIndexState);
};

export const resolveButtonTabChunkLocation = (
  id: string,
): ButtonTabChunkLocation | null => {
  return resolveControlTabChunkLocation(id, buttonChunkIndexState);
};

export const resolveInputTabChunkLocation = (
  id: string,
): InputTabChunkLocation | null => {
  return resolveControlTabChunkLocation(id, inputChunkIndexState);
};

export const buildPageReadResult = ({
  headerLines,
  contentLabel,
  content,
  isInternal,
}: PageReadResultArgs): string => {
  const header = headerLines.join("\n");
  if (isInternal) {
    return `${header}\n${t("statusReadFailedInternal")}`;
  }
  return `${header}\n${contentLabel}\n${content}`;
};

const buildPageContentMessage = (
  tabId: number,
  pageNumber: number | undefined,
  options: FetchPageMarkdownDataOptions,
): GetPageContentRequest => {
  const message: GetPageContentRequest = { tabId, type: "getPageContent" };
  if (pageNumber !== undefined) {
    message.pageNumber = resolvePageNumber(pageNumber);
  }
  if (options.locateViewportCenter === true) {
    message.locateViewportCenter = true;
  }
  return message;
};

const buildPageHashMessage = (
  tabId: number,
  pageData?: {
    chunkAnchorWeights?: readonly ChunkAnchorWeight[];
    pageNumber?: number;
    totalPages?: number;
    viewportPage?: number;
  },
): SetPageHashRequest => {
  const metadata = resolvePageMetadata(pageData ?? {});
  const message: SetPageHashRequest = {
    tabId,
    type: "setPageHash",
  };
  if (metadata.chunkAnchorWeights !== undefined) {
    message.chunkAnchorWeights = metadata.chunkAnchorWeights;
  }
  message.pageNumber = metadata.pageNumber;
  message.totalPages = metadata.totalPages;
  return message;
};

export const resolvePageImageInput = async (
  url: string,
  options: ResolvePageImageInputOptions = {},
): Promise<ToolImageInput | null> => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    console.error("图片 URL 解析失败", { url }, error);
    throw new Error("图片 URL 解析失败");
  }
  let mimeType = resolveSupportedImageMimeType(parsedUrl.toString());
  if (
    mimeType === null &&
    options.allowRemoteContentTypeProbe === true &&
    (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:")
  ) {
    mimeType = await probeRemoteImageMimeType(parsedUrl.toString());
  }
  if (mimeType === null) {
    return null;
  }
  if (parsedUrl.protocol === "file:") {
    const data = await readImageBase64FromFileUrl(parsedUrl.toString());
    return {
      data,
      mimeType,
      sourceType: "base64",
    };
  }
  if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
    return {
      mimeType,
      sourceType: "url",
      url: parsedUrl.toString(),
    };
  }
  if (parsedUrl.protocol === "data:") {
    try {
      const data = decodeDataUrlBase64(parsedUrl.toString());
      return {
        data,
        mimeType,
        sourceType: "base64",
      };
    } catch (error) {
      console.error("解析 data:image 失败", { url }, error);
      throw new Error("解析 data:image 失败");
    }
  }
  const error = new Error(`不支持的图片 URL 协议：${parsedUrl.protocol}`);
  console.error(error.message, { url });
  throw error;
};

export const resolvePageImageInputFromMarkdown = async (
  markdown: string,
  baseUrl: string,
): Promise<ToolImageInput | null> => {
  const imageUrl = resolveMarkdownImageUrl(markdown, baseUrl);
  if (imageUrl === null) {
    return null;
  }
  return resolvePageImageInput(imageUrl, {
    allowRemoteContentTypeProbe: true,
  });
};

export const fetchPageMarkdownData = async (
  tabId: number,
  pageNumber?: number,
  options: FetchPageMarkdownDataOptions = {},
): Promise<PageMarkdownData> => {
  const shouldRetry = await waitForContentScript(tabId),
    fetchOnce = async () => {
      const pageData: GetPageContentSuccessResponse = await sendMessageToTab(
        tabId,
        buildPageContentMessage(tabId, pageNumber, options),
      );
      const metadata = resolvePageMetadata(pageData, pageNumber);
      const buttonChunkPages = resolveButtonChunkPages(pageData, metadata),
        inputChunkPages = resolveInputChunkPages(pageData, metadata);
      updateButtonChunkIndexForTab(tabId, buttonChunkPages);
      updateInputChunkIndexForTab(tabId, inputChunkPages);
      return {
        content: pageData.content,
        title: pageData.title,
        url: pageData.url,
        ...metadata,
      };
    },
    startTime = Date.now();
  let attemptIndex = 0;
  for (;;) {
    try {
      return await fetchOnce();
    } catch (error) {
      const failure = normalizePageReadFailure(error),
        navigationFailure = getTabNavigationFailure(tabId),
        shouldReplaceWithNavigationFailure =
          navigationFailure !== null &&
          contentScriptMissingReceiverPattern.test(failure.message);
      if (shouldReplaceWithNavigationFailure) {
        const normalizedFailure = new Error(navigationFailure.error);
        console.error(
          `页面内容获取失败：${normalizedFailure.message}`,
          normalizedFailure,
          navigationFailure,
        );
        throw normalizedFailure;
      }
      const failureMessage = `页面内容获取失败：${failure.message}`;
      if (!shouldRetry) {
        console.error(failureMessage, failure);
        throw failure;
      }
      const elapsedMs = Date.now() - startTime,
        delayMs = resolvePageContentRetryDelay(attemptIndex),
        attemptsMade = attemptIndex + 1,
        retryWarningMessage = `第${String(attemptsMade)}次获取页面内容获取失败：${failure.message}`;
      console.warn(retryWarningMessage, failure);
      if (elapsedMs + delayMs >= pageContentRetryTimeoutMs) {
        console.warn(failureMessage, failure);
        throw failure;
      }
      await waitForDelay(delayMs);
      attemptIndex += 1;
    }
  }
};

export const syncPageHash = async (
  tabId: number,
  pageData?: {
    chunkAnchorWeights?: ChunkAnchorWeight[];
    pageNumber?: number;
    totalPages?: number;
    viewportPage?: number;
  },
): Promise<void> => {
  await waitForContentScript(tabId);
  const response = await sendMessageToTab(
    tabId,
    buildPageHashMessage(tabId, pageData),
  );
  if (response.skipped) {
    return;
  }
  if (!response.shouldReload) {
    return;
  }
  await reloadTab(tabId);
};

export const shouldFollowMode = async (): Promise<boolean> => {
  const settings = await getSettings();
  if (!settings.followMode) {
    return false;
  }
  const sidePanelContexts = await chrome.runtime.getContexts({
    contextTypes: ["SIDE_PANEL"],
  });
  return sidePanelContexts.length > 0;
};
