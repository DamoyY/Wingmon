import { addMessage } from "../state/index.js";
import { getActiveTab } from "../services/index.js";
import { buildPageMarkdownToolOutput, toolNames } from "../tools/index.js";
import { createRandomId } from "../utils/index.js";

const resolveTabId = (activeTab) => {
  if (typeof activeTab?.id !== "number") {
    throw new Error("活动标签页缺少 TabID");
  }
  return activeTab.id;
};

const appendSharedPageContext = async () => {
  const activeTab = await getActiveTab();
  const tabId = resolveTabId(activeTab);
  const callId = createRandomId("local");
  const args = { tabId };
  const output = await buildPageMarkdownToolOutput(tabId);
  const toolCall = {
    id: callId,
    type: "function",
    function: {
      name: toolNames.getPageMarkdown,
      arguments: JSON.stringify(args),
    },
    call_id: callId,
  };
  addMessage({ role: "assistant", content: "", tool_calls: [toolCall] });
  addMessage({
    role: "tool",
    content: output,
    tool_call_id: callId,
    name: toolNames.getPageMarkdown,
  });
};

export default appendSharedPageContext;
