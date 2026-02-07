import { addMessage } from "../../../core/store/index.ts";
import { getActiveTab } from "../../../core/services/index.ts";
import { handleToolCalls, toolNames } from "../../../core/agent/index.js";
import { fetchPageMarkdownData } from "../../../core/agent/pageReadHelpers.ts";
import { createRandomId } from "../../../lib/utils/index.ts";

const resolveTabId = (activeTab) => {
    if (typeof activeTab?.id !== "number") {
      throw new Error("活动标签页缺少 TabID");
    }
    return activeTab.id;
  },
  ensureNotAborted = (signal) => {
    if (signal?.aborted) {
      throw new Error("已停止");
    }
  },
  clamp = (value, min, max) => Math.min(max, Math.max(min, value)),
  resolveViewportPlan = (pageData) => {
    const totalChunks =
        Number.isInteger(pageData?.totalPages) && pageData.totalPages > 0
          ? pageData.totalPages
          : 1,
      viewportCenterRaw =
        typeof pageData?.viewportPage === "number" &&
        Number.isFinite(pageData.viewportPage)
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
  resolvePageNumber = (value) => {
    if (Number.isInteger(value) && value > 0) {
      return value;
    }
    throw new Error("page_number 必须是正整数");
  },
  buildGetPageArguments = (tabId, pageNumber) => {
    const args = {
      tabId,
      page_number: resolvePageNumber(pageNumber),
    };
    args.preserve_viewport = true;
    return args;
  },
  buildGetPageToolCall = (tabId, callId, pageNumber) => ({
    id: callId,
    type: "function",
    function: {
      name: toolNames.getPageMarkdown,
      arguments: JSON.stringify(buildGetPageArguments(tabId, pageNumber)),
    },
    call_id: callId,
  }),
  executeGetPageToolCall = async ({ tabId, callId, pageNumber, signal }) => {
    ensureNotAborted(signal);
    const toolCall = buildGetPageToolCall(tabId, callId, pageNumber),
      toolMessages = await handleToolCalls([toolCall], signal);
    ensureNotAborted(signal);
    if (toolMessages.length !== 1) {
      throw new Error("get_page 工具调用结果数量无效");
    }
    const [toolMessage] = toolMessages;
    if (!toolMessage || toolMessage.role !== "tool") {
      throw new Error("get_page 工具调用结果格式无效");
    }
    if (typeof toolMessage.content !== "string") {
      throw new Error("get_page 工具调用结果内容无效");
    }
    return toolMessage;
  },
  appendToolCallMessages = ({ tabId, callId, pageNumber, toolMessage }) => {
    addMessage({
      role: "assistant",
      content: "",
      tool_calls: [buildGetPageToolCall(tabId, callId, pageNumber)],
      groupId: createRandomId("assistant"),
    });
    addMessage(toolMessage);
  },
  appendSharedPageContext = async ({ signal } = {}) => {
    const activeTab = await getActiveTab(),
      tabId = resolveTabId(activeTab);
    ensureNotAborted(signal);
    const pageData = await fetchPageMarkdownData(tabId),
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
          tabId,
          callId,
          pageNumber,
          signal,
        });
      appendToolCallMessages({
        tabId,
        callId,
        pageNumber,
        toolMessage,
      });
    }
  };

export default appendSharedPageContext;
