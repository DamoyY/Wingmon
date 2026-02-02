import { addMessage } from "../../../state/index.js";
import { getActiveTab } from "../../../services/index.js";
import {
  buildPageMarkdownToolOutput,
  toolNames,
} from "../../../tools/index.js";
import { createRandomId } from "../../../utils/index.js";

const resolveTabId = (activeTab) => {
    if (typeof activeTab?.id !== "number") {
      throw new Error("活动标签页缺少 TabID");
    }
    return activeTab.id;
  },
  appendSharedPageContext = async () => {
    const activeTab = await getActiveTab(),
      tabId = resolveTabId(activeTab),
      callId = createRandomId("local"),
      args = { tabId },
      output = await buildPageMarkdownToolOutput(tabId),
      toolCall = {
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
