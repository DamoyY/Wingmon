import { isPdfUrl } from "../../../shared/index.ts";
import { isInternalUrl, t } from "../../utils/index.ts";
import { createTab, focusTab, getAllTabs } from "../../services/index.js";
import ToolInputError from "../errors.js";
import { ensureObjectArgs, parsePageNumber } from "../validation/index.js";
import {
  buildPageReadResult,
  fetchPageMarkdownData,
  shouldFollowMode,
} from "../pageRead.ts";

type OpenPageArgs = {
  url: string;
  focus: boolean;
  pageNumber?: number;
};

type OpenPageReadOutputArgs = {
  title: string;
  tabId: number;
  content?: string;
  isInternal: boolean;
};

type TabLike = {
  id?: number;
  url?: string;
  title?: string;
};

type NormalizedTab = TabLike & {
  normalizedUrl: string;
};

type CreatedTab = {
  id: number;
  title?: string;
  url?: string;
};

type ToolInputErrorCtor = new (message: string) => Error;

const ToolInputErrorSafe = ToolInputError as ToolInputErrorCtor,
  createTabSafe: (url: string, focus: boolean) => Promise<CreatedTab> =
    createTab as (url: string, focus: boolean) => Promise<CreatedTab>,
  focusTabSafe: (tabId: number) => Promise<void> = focusTab as (
    tabId: number,
  ) => Promise<void>,
  getAllTabsSafe: () => Promise<TabLike[]> = getAllTabs as () => Promise<
    TabLike[]
  >,
  isInternalUrlSafe: (url: string) => boolean = isInternalUrl as (
    url: string,
  ) => boolean,
  tSafe: (key: string, args?: string[]) => string = t as (
    key: string,
    args?: string[],
  ) => string,
  ensureObjectArgsSafe: (args: unknown) => void = ensureObjectArgs as (
    args: unknown,
  ) => void,
  parsePageNumberSafe: (value: unknown) => number | undefined =
    parsePageNumber as (value: unknown) => number | undefined;

const parameters = {
    type: "object",
    properties: {
      url: { type: "string" },
      focus: { type: "boolean", description: tSafe("toolParamFocus") },
      page_number: {
        type: "number",
        description: tSafe("toolParamPageNumber"),
      },
    },
    required: ["url", "focus"],
    additionalProperties: false,
  },
  buildOpenPageAlreadyExistsOutput = (tabId: number): string =>
    tSafe("statusAlreadyExists", [String(tabId)]),
  buildOpenPageReadOutput = ({
    title,
    tabId,
    content = "",
    isInternal,
  }: OpenPageReadOutputArgs): string =>
    buildPageReadResult({
      headerLines: [
        tSafe("statusOpenSuccess"),
        `${tSafe("statusTitle")}: "${title}"`,
        `${tSafe("statusTabId")}: "${String(tabId)}"`,
      ],
      contentLabel: `${tSafe("statusContent")}：`,
      content,
      isInternal,
    }),
  normalizeTab = (tab: TabLike): NormalizedTab | null => {
    if (typeof tab.url !== "string" || !tab.url.trim()) {
      console.error("标签页缺少 URL", tab);
      return null;
    }
    try {
      return { ...tab, normalizedUrl: new URL(tab.url).toString() };
    } catch (error) {
      console.error("标签页 URL 解析失败", tab, error);
      return null;
    }
  },
  validateArgs = (args: unknown): OpenPageArgs => {
    ensureObjectArgsSafe(args);
    const rawArgs = args as Record<string, unknown>;
    if (typeof rawArgs.url !== "string" || !rawArgs.url.trim()) {
      throw new ToolInputErrorSafe("url 必须是非空字符串");
    }
    if (typeof rawArgs.focus !== "boolean") {
      throw new ToolInputErrorSafe("focus 必须是布尔值");
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawArgs.url);
    } catch (error) {
      console.error("url 格式不正确", error);
      throw new ToolInputErrorSafe("url 格式不正确");
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new ToolInputErrorSafe("url 仅支持 http 或 https");
    }
    const pageNumber = parsePageNumberSafe(rawArgs.page_number);
    return { url: parsedUrl.toString(), focus: rawArgs.focus, pageNumber };
  },
  execute = async ({
    url,
    focus,
    pageNumber,
  }: OpenPageArgs): Promise<string> => {
    const followMode = await shouldFollowMode(),
      shouldFocus = followMode || focus,
      tabs = await getAllTabsSafe(),
      normalizedTabs = tabs
        .map(normalizeTab)
        .filter((tab): tab is NormalizedTab => Boolean(tab)),
      matchedTab = normalizedTabs.find((tab) => tab.normalizedUrl === url);
    if (matchedTab) {
      if (typeof matchedTab.id !== "number") {
        throw new Error("标签页缺少 TabID");
      }
      if (shouldFocus) {
        await focusTabSafe(matchedTab.id);
      }
      if (pageNumber !== undefined && isPdfUrl(url)) {
        const {
          title,
          url: pageUrl,
          content,
        } = await fetchPageMarkdownData(matchedTab.id, pageNumber);
        return buildOpenPageReadOutput({
          title,
          tabId: matchedTab.id,
          content,
          isInternal: isInternalUrlSafe(pageUrl || url),
        });
      }
      return buildOpenPageAlreadyExistsOutput(matchedTab.id);
    }
    const tab = await createTabSafe(url, shouldFocus);
    if (shouldFocus) {
      await focusTabSafe(tab.id);
    }
    const initialInternal = isInternalUrlSafe(url);
    if (initialInternal) {
      const title = tab.title || "";
      return buildOpenPageReadOutput({
        title,
        tabId: tab.id,
        isInternal: true,
      });
    }
    const {
      title,
      url: pageUrl,
      content,
    } = await fetchPageMarkdownData(tab.id, pageNumber);
    return buildOpenPageReadOutput({
      title,
      tabId: tab.id,
      content,
      isInternal: isInternalUrlSafe(pageUrl || url),
    });
  };

export default {
  key: "openBrowserPage",
  name: "open_page",
  description: tSafe("toolOpenPage"),
  parameters,
  validateArgs,
  execute,
};
