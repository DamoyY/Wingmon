import {
  type ApiType,
  type BrowserTab,
  getActiveTab,
} from "../services/index.ts";
import {
  type PageMarkdownData,
  fetchPageMarkdownData,
} from "../agent/pageReadHelpers.ts";
import { type ToolCall, toolNames } from "../agent/definitions.ts";
import { addMessage } from "../../shared/state/panelStateContext.ts";
import { createRandomId } from "../../shared/index.ts";
import { handleToolCalls } from "../agent/executor.ts";

type GetPageArguments = {
  pageNumber: number;
  preserveViewport: true;
  tabId: number;
};

type GetPageToolCall = ToolCall & {
  function: {
    arguments: string;
    name: string;
  };
  id: string;
  type: "function";
};

type ToolMessage = Awaited<ReturnType<typeof handleToolCalls>>[number];

type ViewportPlan = {
  currentChunk: number;
  nearbyChunk: number | null;
};

type ExecuteGetPageToolCallPayload = {
  apiType?: ApiType;
  callId: string;
  pageNumber: number;
  signal?: AbortSignal;
  tabId: number;
};

const resolveTabId = (activeTab: BrowserTab): number => {
    if (typeof activeTab.id !== "number") {
      throw new Error("活动标签页缺少 Tab ID");
    }
    return activeTab.id;
  },
  ensureNotAborted = (signal?: AbortSignal): void => {
    if (signal?.aborted) {
      throw new Error("已停止");
    }
  },
  clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value)),
  resolveViewportPlan = (pageData: PageMarkdownData): ViewportPlan => {
    const totalChunks =
        Number.isInteger(pageData.totalPages) && pageData.totalPages > 0
          ? pageData.totalPages
          : 1,
      viewportCenterRaw = Number.isFinite(pageData.viewportPage)
        ? pageData.viewportPage
        : 1,
      viewportCenter = clamp(viewportCenterRaw, 1, totalChunks),
      currentChunk = clamp(Math.ceil(viewportCenter), 1, totalChunks);
    if (totalChunks === 1) {
      return { currentChunk, nearbyChunk: null };
    }
    const relativeOffset = viewportCenter - (currentChunk - 1),
      direction = relativeOffset >= 0.5 ? 1 : -1;
    let nearbyChunk = currentChunk + direction;
    if (nearbyChunk < 1 || nearbyChunk > totalChunks) {
      nearbyChunk = currentChunk - direction;
    }
    if (
      nearbyChunk < 1 ||
      nearbyChunk > totalChunks ||
      nearbyChunk === currentChunk
    ) {
      return { currentChunk, nearbyChunk: null };
    }
    return { currentChunk, nearbyChunk };
  },
  resolvePageNumber = (value: number): number => {
    if (Number.isInteger(value) && value > 0) {
      return value;
    }
    throw new Error("pageNumber 必须是正整数");
  },
  buildGetPageArguments = ({
    pageNumber,
    tabId,
  }: {
    pageNumber: number;
    tabId: number;
  }): GetPageArguments => ({
    pageNumber: resolvePageNumber(pageNumber),
    preserveViewport: true,
    tabId,
  }),
  buildGetPageToolCall = (
    callId: string,
    pageNumber: number,
    tabId: number,
  ): GetPageToolCall => ({
    function: {
      arguments: JSON.stringify(buildGetPageArguments({ pageNumber, tabId })),
      name: toolNames.getPageMarkdown,
    },
    id: callId,
    type: "function",
  }),
  executeGetPageToolCall = async ({
    apiType,
    callId,
    pageNumber,
    signal,
    tabId,
  }: ExecuteGetPageToolCallPayload): Promise<ToolMessage> => {
    ensureNotAborted(signal);
    const toolCall = buildGetPageToolCall(callId, pageNumber, tabId),
      toolMessages = await handleToolCalls(
        [toolCall],
        signal,
        undefined,
        apiType,
      );
    ensureNotAborted(signal);
    if (toolMessages.length !== 1) {
      throw new Error("get_page 工具调用结果数量无效");
    }
    return toolMessages[0];
  },
  appendToolCallMessages = ({
    callId,
    pageNumber,
    tabId,
    toolMessage,
  }: {
    callId: string;
    pageNumber: number;
    tabId: number;
    toolMessage: ToolMessage;
  }): void => {
    addMessage({
      content: "",
      groupId: createRandomId("assistant"),
      role: "assistant",
      tool_calls: [buildGetPageToolCall(callId, pageNumber, tabId)],
    });
    addMessage(toolMessage);
  },
  appendSharedPageContext = async ({
    apiType,
    signal,
  }: { apiType?: ApiType; signal?: AbortSignal } = {}): Promise<void> => {
    const activeTab = await getActiveTab(),
      tabId = resolveTabId(activeTab);
    ensureNotAborted(signal);
    const pageData = await fetchPageMarkdownData(tabId, undefined, {
        locateViewportCenter: true,
      }),
      viewportPlan = resolveViewportPlan(pageData),
      pageNumbers = [viewportPlan.currentChunk];
    if (viewportPlan.nearbyChunk !== null) {
      pageNumbers.push(viewportPlan.nearbyChunk);
    }
    const orderedPageNumbers =
      pageNumbers.length === 2 && pageNumbers[1] < pageNumbers[0]
        ? [pageNumbers[1], pageNumbers[0]]
        : pageNumbers;
    for (const pageNumber of orderedPageNumbers) {
      ensureNotAborted(signal);
      const callId = createRandomId("local"),
        toolMessage = await executeGetPageToolCall({
          apiType,
          callId,
          pageNumber,
          signal,
          tabId,
        });
      appendToolCallMessages({
        callId,
        pageNumber,
        tabId,
        toolMessage,
      });
    }
  };

export default appendSharedPageContext;
