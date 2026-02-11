import { type BrowserTab, getActiveTab } from "../../../core/services/index.ts";
import {
  type PageMarkdownData,
  fetchPageMarkdownData,
} from "../../../core/agent/pageReadHelpers.ts";
import { type ToolCall, toolNames } from "../../../core/agent/definitions.ts";
import { addMessage } from "../../../core/store/index.ts";
import { createRandomId } from "../../../lib/utils/index.ts";
import { handleToolCalls } from "../../../core/agent/executor.ts";

type GetPageArguments = {
  tabId: number;
  page_number: number;
  preserve_viewport: true;
};

type GetPageToolCall = ToolCall & {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
  call_id: string;
};

type ToolMessage = Awaited<ReturnType<typeof handleToolCalls>>[number];

type ViewportPlan = {
  currentChunk: number;
  nearbyChunk: number | null;
};

type ExecuteGetPageToolCallPayload = {
  tabId: number;
  callId: string;
  pageNumber: number;
  signal?: AbortSignal;
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
    throw new Error("page_number 必须是正整数");
  },
  buildGetPageArguments = (
    tabId: number,
    pageNumber: number,
  ): GetPageArguments => ({
    page_number: resolvePageNumber(pageNumber),
    preserve_viewport: true,
    tabId,
  }),
  buildGetPageToolCall = (
    tabId: number,
    callId: string,
    pageNumber: number,
  ): GetPageToolCall => ({
    call_id: callId,
    function: {
      arguments: JSON.stringify(buildGetPageArguments(tabId, pageNumber)),
      name: toolNames.getPageMarkdown,
    },
    id: callId,
    type: "function",
  }),
  executeGetPageToolCall = async ({
    tabId,
    callId,
    pageNumber,
    signal,
  }: ExecuteGetPageToolCallPayload): Promise<ToolMessage> => {
    ensureNotAborted(signal);
    const toolCall = buildGetPageToolCall(tabId, callId, pageNumber),
      toolMessages = await handleToolCalls([toolCall], signal);
    ensureNotAborted(signal);
    if (toolMessages.length !== 1) {
      throw new Error("get_page 工具调用结果数量无效");
    }
    return toolMessages[0];
  },
  appendToolCallMessages = ({
    tabId,
    callId,
    pageNumber,
    toolMessage,
  }: {
    tabId: number;
    callId: string;
    pageNumber: number;
    toolMessage: ToolMessage;
  }): void => {
    addMessage({
      content: "",
      groupId: createRandomId("assistant"),
      role: "assistant",
      tool_calls: [buildGetPageToolCall(tabId, callId, pageNumber)],
    });
    addMessage(toolMessage);
  },
  appendSharedPageContext = async ({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<void> => {
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
