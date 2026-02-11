import {
  type GetPageContentRequest,
  type GetPageContentResponse,
} from "../../shared/index.ts";
import {
  isPdfDocument,
  resolveAliasedPageNumberInput,
} from "../common/index.ts";
import convertPageContentToMarkdown from "../extractors/converter.js";
import convertPdfToMarkdown from "../extractors/pdfConverter.js";
import withPreparedBody from "./withPreparedBody.js";

type SendResponse = (response: GetPageContentResponse) => void;

type GoogleSearchItem = {
  title: string;
  link: string;
  snippet: string;
};

const googleSearchHost = "www.google.com";
const googleSearchPath = "/search";
const googleResultLinkBlockedPaths = new Set<string>([
  "/search",
  "/imgres",
  "/url",
  "/aclk",
]);
const googleResultLinkTrackingParams = new Set<string>([
  "ved",
  "usg",
  "sei",
  "opi",
  "gclid",
  "fbclid",
]);
const googleResultLineSeparator = "\n---\n";
const googleResultTextPattern = /\s+/gu;
const googleHostPattern = /^([\w-]+\.)*google\./iu;
const googleSnippetIgnorePattern =
  /^(translate this page|about this result|翻译此页|关于这条结果|缓存)$/iu;

const sendError = (sendResponse: SendResponse, message: string): void => {
  console.error(message);
  sendResponse({ error: message });
};

const resolveMessagePageNumber = (message: GetPageContentRequest): number => {
  return resolveAliasedPageNumberInput({
    camelProvided: "pageNumber" in message,
    camelValue: message.pageNumber ?? null,
    defaultValue: 1,
    mismatchMessage: "pageNumber 与 page_number 不一致",
    snakeProvided: "page_number" in message,
    snakeValue: message.page_number ?? null,
  });
};

const resolveUrlOrNull = (value: string, base?: string): URL | null => {
  try {
    if (typeof base === "string" && base.trim()) {
      return new URL(value, base);
    }
    return new URL(value);
  } catch (error) {
    console.error("URL 解析失败", { base, value }, error);
    return null;
  }
};

const normalizeText = (text: string): string => {
  return text.replace(googleResultTextPattern, " ").trim();
};

const isVisible = (element: Element | null): element is HTMLElement => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const isGoogleHost = (hostname: string): boolean => {
  return googleHostPattern.test(hostname);
};

const unwrapGoogleRedirect = (href: string): string => {
  const parsedUrl = resolveUrlOrNull(href, location.origin);
  if (!(parsedUrl instanceof URL)) {
    return "";
  }
  if (isGoogleHost(parsedUrl.hostname) && parsedUrl.pathname === "/url") {
    const target =
      parsedUrl.searchParams.get("q") ?? parsedUrl.searchParams.get("url");
    if (typeof target === "string" && target.trim()) {
      const resolvedTarget = resolveUrlOrNull(target, location.origin);
      if (resolvedTarget instanceof URL) {
        return resolvedTarget.toString();
      }
      return "";
    }
  }
  return parsedUrl.toString();
};

const canonicalizeUrl = (href: string): string => {
  const parsedUrl = resolveUrlOrNull(href);
  if (!(parsedUrl instanceof URL)) {
    return "";
  }
  parsedUrl.hash = "";
  googleResultLinkTrackingParams.forEach((key) => {
    parsedUrl.searchParams.delete(key);
  });
  Array.from(parsedUrl.searchParams.keys()).forEach((key) => {
    if (/^utm_/iu.test(key)) {
      parsedUrl.searchParams.delete(key);
    }
  });
  return parsedUrl.toString();
};

const isLikelyResultLink = (href: string): boolean => {
  const parsedUrl = resolveUrlOrNull(href);
  if (!(parsedUrl instanceof URL)) {
    return false;
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return false;
  }
  if (isGoogleHost(parsedUrl.hostname)) {
    return false;
  }
  return !googleResultLinkBlockedPaths.has(parsedUrl.pathname);
};

const shouldUseSnippetText = (text: string, title: string): boolean => {
  if (!text || text === title || text.length < 20) {
    return false;
  }
  if (/^https?:\/\//iu.test(text)) {
    return false;
  }
  return !googleSnippetIgnorePattern.test(text);
};

const resolveGoogleSearchItems = (): GoogleSearchItem[] => {
  const searchRoot = document.querySelector("#search");
  if (!(searchRoot instanceof HTMLElement)) {
    console.warn("Google 搜索结果容器缺失");
    return [];
  }
  const headingAnchors = Array.from(
      searchRoot.querySelectorAll("a[href]"),
    ).filter((element): element is HTMLAnchorElement => {
      return (
        element instanceof HTMLAnchorElement &&
        element.querySelector("h3") instanceof HTMLHeadingElement &&
        isVisible(element)
      );
    }),
    items: GoogleSearchItem[] = [],
    seenLinks = new Set<string>();
  headingAnchors.forEach((anchor) => {
    const heading = anchor.querySelector("h3");
    if (!(heading instanceof HTMLHeadingElement)) {
      console.error("Google 搜索结果标题缺失", anchor);
      return;
    }
    const title = normalizeText(heading.innerText);
    if (!title) {
      return;
    }
    const rawLink = anchor.getAttribute("href") || anchor.href || "",
      link = canonicalizeUrl(unwrapGoogleRedirect(rawLink));
    if (!link || !isLikelyResultLink(link)) {
      return;
    }
    if (seenLinks.has(link)) {
      return;
    }
    const card = anchor.closest("[data-hveid]"),
      snippetNode = card?.querySelector('[data-sncf="1"]') ?? null,
      snippetText = isVisible(snippetNode)
        ? normalizeText(snippetNode.innerText)
        : "",
      snippet = shouldUseSnippetText(snippetText, title) ? snippetText : "";
    seenLinks.add(link);
    items.push({
      link,
      snippet,
      title,
    });
  });
  return items;
};

const formatGoogleSearchItems = (items: GoogleSearchItem[]): string => {
  return items
    .map((item) => [item.title, item.link, item.snippet].join("\n"))
    .join(googleResultLineSeparator);
};

const isGoogleSearchPage = (url: string): boolean => {
  const parsedUrl = resolveUrlOrNull(url);
  if (!(parsedUrl instanceof URL)) {
    return false;
  }
  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname.toLowerCase() !== googleSearchHost
  ) {
    return false;
  }
  return parsedUrl.pathname === googleSearchPath && parsedUrl.search.length > 1;
};

const buildGoogleSearchResponse = ({
  pageNumber,
  title,
  url,
}: {
  pageNumber: number;
  title: string;
  url: string;
}): GetPageContentResponse => {
  if (pageNumber > 1) {
    throw new Error(`page_number 超出范围：${String(pageNumber)}，总页数：1`);
  }
  const items = resolveGoogleSearchItems();
  return {
    content: formatGoogleSearchItems(items),
    pageNumber: 1,
    title,
    totalPages: 1,
    url,
    viewportPage: 1,
  };
};

const handleGetPageContent = async (
  message: GetPageContentRequest,
  sendResponse: SendResponse,
): Promise<void> => {
  try {
    const title = document.title || "",
      url = window.location.href || "",
      pageNumber = resolveMessagePageNumber(message);
    if (isPdfDocument()) {
      const markdown = await convertPdfToMarkdown({ pageNumber, title, url });
      sendResponse(markdown);
      return;
    }
    if (isGoogleSearchPage(url)) {
      sendResponse(
        buildGoogleSearchResponse({
          pageNumber,
          title,
          url,
        }),
      );
      return;
    }
    const markdown = withPreparedBody((body) => {
      return convertPageContentToMarkdown({
        body,
        pageNumber,
        title,
        url,
      });
    });
    sendResponse(markdown);
  } catch (error) {
    sendError(
      sendResponse,
      error instanceof Error ? error.message : "页面内容读取失败",
    );
  }
};

export default handleGetPageContent;
