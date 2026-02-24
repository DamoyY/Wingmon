语言选项 / Language Option：

[简体中文](README_SC.md) | English

---

<img src="https://raw.githubusercontent.com/DamoyY/Wingmon/refs/heads/main/res/logo.svg" width="100">

# Wingmon - A More Elegant Browsing Experience

Wingmon is a browser sidebar extension built to deeply integrate large language models into everyday browsing.
Unlike many other products, Wingmon is a full Agent that can read web pages and even operate the browser itself, not just a chat window.

---

## Why Wingmon

### AI no longer just tells users what to do

With its unique architecture, Wingmon can continuously interact with the browser **in a human-like way**: clicking buttons and links, opening and closing tabs, and switching between tabs.

We made an early bet on LLMs, and it paid off. Even with these foundational capabilities alone, Wingmon has already shown strong productivity in real-world tasks.

### Cases

In one information investigation workflow, Wingmon:
- entered search keywords in Google and launched the search;
- opened several trustworthy results;
- summarized the findings and closed those tabs;
- presented the final information in a visual format.

Demo video:

https://github.com/user-attachments/assets/03e70187-17dc-4a7c-880c-f50fbf59828e

**This is an example where Wingmon autonomously clicks buttons, enters text, and completes a long-running, complex workflow:**

https://github.com/user-attachments/assets/77406e7c-3f28-4fd2-a39b-53e2fa63c61f

### Simple scenarios

In many cases, users do not need AI to perform complex actions. They simply want to ask questions about the current page.
Thanks to its end-to-end framework design, Wingmon handles this equally well.
Users can click **“Send with Page”**, and page content is sent directly to Wingmon without tool calls, reducing potential misunderstandings as much as possible.

---

## How Wingmon builds trust with users

### Trust
#### Wingmon has no backend.
To give the Agent strong capabilities, we already keep permissions as minimal as possible, but we know users may still have concerns.
Guided by a privacy-first philosophy:
- **Wingmon provides no built-in model**
- **Wingmon has no server backend**
- **All usage records disappear after uninstalling**

Wingmon currently supports the Chat Completions API, Responses API, Gemini API, and Messages API. You can use providers you trust, including local models.
When choosing a model, our recommended benchmark is [Tau-2 Bench](https://arxiv.org/abs/2506.07982).

### Less is more

We believe products like this should not interrupt the browsing experience.
- Wingmon lives in the browser **sidebar**. You can open it with one click, send it fully to the background with one click, or let it keep working in the background and notify you when tasks are done.
- “Noisy” products are frustrating. We aim to deliver powerful capabilities through a simpler interface.

---

## Installation and Usage

Wingmon is open source. You can install it in one click from the [Chrome Web Store](https://chromewebstore.google.com/category/extensions), download the package from [GitHub Releases](https://github.com/DamoyY/Wingmon/releases) for manual installation, or clone this repository and build it yourself.

### Manual installation steps:
1. Download and extract the release package.
2. Open Chrome or Edge.
3. Visit `chrome://extensions/` or `edge://extensions/`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the Wingmon folder.
7. Click the Wingmon icon in the browser toolbar to open the sidebar.
8. For first-time use, fill in your configuration.
9. Click Save and start chatting with Wingmon.

### Follow Mode
Above the composer, you can enable **Follow Mode**. Once enabled, your viewport stays synced with Wingmon.

### Advanced Configuration

If you use a third-party relay API, or want to force-enable hidden model capabilities (for example, exposing reasoning behavior), you can override the request body sent to the model with YAML in **Advanced Configuration** under Settings.

Example:
```yaml
- path: "temperature"
  value: 0.7
- path: "reasoning.effort"
  value: "high"
```

In service backend settings, you may also notice the `Codex Backend [Risk]` option. It lets you sign in with your ChatGPT account and directly use the underlying response interface used by OpenAI Codex CLI.
- **Advantage**: Faster sign-in, and direct use of quota from your ChatGPT subscription.
- **Risk**: This is not part of OpenAI’s standard public API offering, and may carry a risk of limitation or account suspension by OpenAI. Please evaluate and use at your own discretion. The developer is not responsible for account issues resulting from this option.

---

## Update roadmap

### Coming soon:
- Reasoning content display.

### Under evaluation:
- Local executable files to extend capability boundaries.

---

## Appendix

### Contact
If you have issues or suggestions, please open an issue. If you are interested in contributing, feel free to contact the author by email.

### Limitations
Not every model delivers satisfying results when connected to Wingmon.

Before using Wingmon, we strongly recommend checking the Agentic capability level of your chosen model.
Known issues include:
- Web information gathering:

  Some models can search autonomously but fail to proactively open result entries. This is often because the search tool used during training returns results directly, which can cause overfitting around “search”-type actions.
- Multimodal capability:

  Under the Chat Completions API, tool return values can only be text. As a result, Wingmon cannot autonomously inspect images when using this API.
- UI functionality:

  Because the Gemini API encrypts chain-of-thought content, the “Send with Page” feature is unavailable when using this API.
