import {
  type ChunkAnchorWeight,
  type GetPageContentRequest,
  type GetPageContentSuccessResponse,
  type SetPageHashRequest,
  type SupportedImageMimeType,
  resolveSupportedImageMimeType,
  resolveSupportedImageMimeTypeFromContentType,
} from "../../../shared/index.ts";
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
import { t } from "../../lib/utils/index.ts";

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
  pageNumber: number | undefined,
  options: FetchPageMarkdownDataOptions,
): GetPageContentRequest => {
  const message: GetPageContentRequest = { type: "getPageContent" };
  if (pageNumber !== undefined) {
    message.pageNumber = resolvePageNumber(pageNumber);
  }
  if (options.locateViewportCenter === true) {
    message.locateViewportCenter = true;
  }
  return message;
};

const buildPageHashMessage = (pageData?: {
  chunkAnchorWeights?: readonly ChunkAnchorWeight[];
  pageNumber?: number;
  totalPages?: number;
  viewportPage?: number;
}): SetPageHashRequest => {
  const metadata = resolvePageMetadata(pageData ?? {});
  return {
    chunkAnchorWeights: metadata.chunkAnchorWeights,
    pageNumber: metadata.pageNumber,
    totalPages: metadata.totalPages,
    type: "setPageHash",
  };
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
        buildPageContentMessage(pageNumber, options),
      );
      const metadata = resolvePageMetadata(pageData, pageNumber);
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
    buildPageHashMessage(pageData),
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
  return settings.followMode;
};
