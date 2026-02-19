import type { PolicyDocumentMap } from "./cobaltTypes.ts";

export const policyDocuments: PolicyDocumentMap = {
  en: {
    introduction:
      "This Privacy Policy explains how the Wingmon Chrome extension collects, uses, stores, and shares information. This policy applies only to the Wingmon extension.",
    sections: [
      {
        blocks: [
          {
            items: [
              {
                text: "Wingmon stores settings in chrome.storage.local, including API key, model, base URL, API type, language, and theme preferences. API keys are stored locally in your browser extension storage and are not additionally encrypted by Wingmon.",
                title: "A. User-provided settings",
              },
              {
                text: "Wingmon stores conversation messages and assistant responses locally to support chat continuity and history features.",
                title: "B. Conversation data",
              },
              {
                text: "When you use page-aware features, Wingmon reads active page content, page URL/title, and interaction markers needed for automation.",
                title: "C. Page content and metadata",
              },
              {
                text: "If you use HTML preview tools, Wingmon stores preview code and timestamps locally.",
                title: "D. HTML preview records",
              },
            ],
            type: "cards",
          },
          {
            text: "Wingmon does not run advertising analytics SDKs and does not sell personal information.",
            type: "paragraph",
          },
        ],
        heading: "1. Information We Process",
      },
      {
        blocks: [
          {
            items: [
              "To generate AI responses to your prompts.",
              "To provide page-reading and browser automation capabilities.",
              "To preserve conversation history and user preferences.",
              "To improve reliability, debugging, and security.",
            ],
            type: "list",
          },
        ],
        heading: "2. How We Use Information",
      },
      {
        blocks: [
          {
            text: "Wingmon processes most data locally in your browser. When you send a request to an AI model, relevant content may be transmitted to the provider configured by you (for example, OpenAI, Anthropic, Google Gemini, or a compatible custom endpoint).",
            type: "paragraph",
          },
          {
            items: [
              "OpenAI",
              "Anthropic",
              "Google Gemini",
              "Custom provider endpoint configured by you",
            ],
            type: "list",
          },
          {
            text: "Data sent to these providers may include your prompt, conversation context, selected page content, and tool-related context needed to generate results. These providers process data under their own terms and privacy policies.",
            type: "paragraph",
          },
        ],
        heading: "3. Sharing and External Processing",
      },
      {
        blocks: [
          {
            text: "If you enable ChatGPT account login, Wingmon opens the provider authorization page and stores OAuth tokens locally in your browser extension storage so the extension can send model requests on your behalf.",
            type: "paragraph",
          },
          {
            items: [
              "Account restrictions risk: your provider account may be rate-limited, suspended, logged out, or otherwise restricted if your usage is considered inconsistent with the provider's terms, product rules, or security policies.",
              "Subscription and entitlement risk: paid subscription benefits belong to the account owner and may not be transferable to third-party tools in all cases.",
              "Automation risk: provider-side anti-abuse systems may flag repeated automated requests, even if initiated by you.",
              "Security risk: tokens are stored in local extension storage. If your browser profile or device is compromised, attackers may use those tokens until they are revoked or expire.",
              "Availability risk: provider auth flows, endpoint behavior, or product policy may change without notice and can break this feature at any time.",
            ],
            type: "list",
          },
          {
            text: "By using account-based login, you confirm you are authorized to use the account this way and accept the above risks. Wingmon cannot guarantee that this feature will remain available or compliant with all third-party rules at all times.",
            type: "paragraph",
          },
          {
            items: [
              "Do not use shared, borrowed, or unauthorized accounts.",
              "Do not use this feature on untrusted or public devices.",
              "Revoke sessions/tokens in your provider account security settings if you suspect misuse.",
              "Use API key mode when you need clearer usage boundaries and operational control.",
            ],
            type: "list",
          },
        ],
        heading: "4. Important Risk Notice for Account-based Login",
      },
      {
        blocks: [
          {
            items: [
              "storage: save settings and local conversation records.",
              "tabs / tabGroups / webNavigation / scripting: read and interact with web pages.",
              "sidePanel / contextMenus / downloads / offscreen: support extension UI, actions, and runtime workflows.",
              "host permissions (http://*/* and https://*/*): allow page extraction and automation on pages where you actively use Wingmon features.",
            ],
            type: "list",
          },
        ],
        heading: "5. Chrome Permissions and Why They Are Used",
      },
      {
        blocks: [
          {
            items: [
              "Conversation history is stored locally with an internal cap.",
              "Conversation history keeps up to 50 conversations locally.",
              "HTML previews keep up to 20 records locally.",
              "Settings remain locally stored until you change them or uninstall the extension.",
            ],
            type: "list",
          },
          {
            text: "You can clear data by deleting conversation records, clearing HTML previews, and uninstalling the extension. Uninstalling removes the extension local storage from your browser.",
            type: "paragraph",
          },
        ],
        heading: "6. Data Retention",
      },
      {
        blocks: [
          {
            items: [
              "Delete conversation history from the history view.",
              "Clear locally stored HTML previews from extension storage.",
              "Uninstall the extension to remove all extension local storage data.",
            ],
            type: "list",
          },
        ],
        heading: "7. Your Choices and Controls",
      },
      {
        blocks: [
          {
            text: "We use browser-provided local storage and extension isolation mechanisms to reduce unauthorized access risks. No method of transmission or storage is completely secure.",
            type: "paragraph",
          },
        ],
        heading: "8. Security",
      },
      {
        blocks: [
          {
            text: "Wingmon is not directed to children under 13, and we do not intentionally collect personal data from children.",
            type: "paragraph",
          },
        ],
        heading: "9. Children's Privacy",
      },
      {
        blocks: [
          {
            text: "If you choose an external AI provider, data may be processed on servers in other countries according to that provider's policies.",
            type: "paragraph",
          },
        ],
        heading: "10. International Data Transfers",
      },
      {
        blocks: [
          {
            text: "If information is received from Google APIs, Wingmon handles it under the Google API Services User Data Policy and its Limited Use requirements.",
            type: "paragraph",
          },
        ],
        heading: "11. Google API Services",
      },
      {
        blocks: [
          {
            text: "We may update this policy from time to time. Updated versions will be published on this page with a revised date.",
            type: "paragraph",
          },
        ],
        heading: "12. Changes to This Policy",
      },
      {
        blocks: [
          {
            text: "For privacy questions or requests, please contact the developer through the support channel listed on the Wingmon Chrome Web Store page.",
            type: "paragraph",
          },
        ],
        heading: "13. Contact",
      },
    ],
    title: "Privacy Policy for Wingmon",
    updatedAt: "Last updated: February 19, 2026 (UTC)",
  },
  zh: {
    introduction:
      "本隐私权政策说明 Wingmon Chrome 扩展如何收集、使用、存储和共享信息。该政策仅适用于 Wingmon 扩展本身。",
    sections: [
      {
        blocks: [
          {
            items: [
              {
                text: "Wingmon 会在 chrome.storage.local 中保存设置项，包括 API Key、模型、Base URL、API 类型、语言和主题偏好等。API Key 保存在浏览器扩展本地存储中，Wingmon 不额外提供加密层。",
                title: "A. 用户提供的设置数据",
              },
              {
                text: "为支持会话连续性和历史记录功能，Wingmon 会在本地保存用户消息与助手回复。",
                title: "B. 对话数据",
              },
              {
                text: "当你使用与页面相关的功能时，Wingmon 会读取当前页面内容、页面 URL/标题，以及执行自动化所需的交互标记。",
                title: "C. 页面内容与元数据",
              },
              {
                text: "当你使用 HTML 预览工具时，Wingmon 会在本地保存预览代码与时间戳。",
                title: "D. HTML 预览记录",
              },
            ],
            type: "cards",
          },
          {
            text: "Wingmon 不集成广告分析 SDK，也不会出售个人信息。",
            type: "paragraph",
          },
        ],
        heading: "1. 我们处理的信息",
      },
      {
        blocks: [
          {
            items: [
              "为你的提示词生成 AI 回复。",
              "提供网页读取与浏览器自动化能力。",
              "保存会话历史与用户偏好。",
              "用于可靠性、调试与安全保障。",
            ],
            type: "list",
          },
        ],
        heading: "2. 信息使用目的",
      },
      {
        blocks: [
          {
            text: "Wingmon 的大部分处理在你的浏览器本地完成。你发起模型请求时，相关内容可能传输到你配置的服务商（例如 OpenAI、Anthropic、Google Gemini，或兼容协议的自定义接口）。",
            type: "paragraph",
          },
          {
            items: [
              "OpenAI",
              "Anthropic",
              "Google Gemini",
              "你配置的自定义服务商接口",
            ],
            type: "list",
          },
          {
            text: "发送给这些服务商的数据可能包括你的提示词、对话上下文、选定页面内容及生成结果所需的工具上下文。上述服务商会按照各自的条款与隐私政策处理数据。",
            type: "paragraph",
          },
        ],
        heading: "3. 共享与外部处理",
      },
      {
        blocks: [
          {
            text: "若你启用 ChatGPT 账号登录，Wingmon 会打开服务商授权页面，并在浏览器扩展本地存储中保存 OAuth Token，以便扩展代表你发起模型请求。",
            type: "paragraph",
          },
          {
            items: [
              "账号限制风险：若服务商认为你的使用方式与其条款、产品规则或安全策略不一致，你的账号可能被限流、强制登出、暂停或施加其他限制。",
              "订阅权益风险：付费订阅权益归属于账号所有者，未必在所有场景都可转用于第三方工具。",
              "自动化风险：即使请求由你主动触发，连续自动化请求仍可能触发服务商风控或反滥用机制。",
              "安全风险：Token 保存在扩展本地存储中；若浏览器配置文件或设备被入侵，攻击者可能在 Token 失效或被撤销前继续使用相关能力。",
              "可用性风险：服务商的授权流程、接口行为或产品政策可能随时调整且不另行通知，相关功能可能因此中断。",
            ],
            type: "list",
          },
          {
            text: "当你使用账号登录能力时，表示你确认自己有权以该方式使用该账号，并接受上述风险。Wingmon 无法保证该能力在任意时间都持续可用，或始终满足所有第三方规则。",
            type: "paragraph",
          },
          {
            items: [
              "不要使用共享、借用或未获授权的账号。",
              "不要在不受信任或公共设备上启用该功能。",
              "一旦怀疑被滥用，请立即在服务商账号安全设置中撤销会话或 Token。",
              "若需要更清晰的使用边界和运维控制，建议使用 API Key 模式。",
            ],
            type: "list",
          },
        ],
        heading: "4. 账号登录能力的重要风险提示",
      },
      {
        blocks: [
          {
            items: [
              "storage：保存设置与本地会话记录。",
              "tabs / tabGroups / webNavigation / scripting：读取并操作网页。",
              "sidePanel / contextMenus / downloads / offscreen：支持扩展界面、动作和运行流程。",
              "host permissions（http://*/* 与 https://*/*）：仅在你主动使用 Wingmon 功能时，对页面执行内容提取与自动化。",
            ],
            type: "list",
          },
        ],
        heading: "5. Chrome 权限及用途",
      },
      {
        blocks: [
          {
            items: [
              "会话历史保存在本地，最多保留 50 条会话。",
              "HTML 预览记录保存在本地，最多保留 20 条记录。",
              "设置项会持续保存在本地，直到你修改或卸载扩展。",
            ],
            type: "list",
          },
          {
            text: "你可以通过删除会话记录、清理 HTML 预览记录和卸载扩展来清除数据。卸载扩展后，浏览器会移除该扩展的本地存储数据。",
            type: "paragraph",
          },
        ],
        heading: "6. 数据保留",
      },
      {
        blocks: [
          {
            items: [
              "在历史记录视图中删除会话记录。",
              "清理扩展本地存储中的 HTML 预览记录。",
              "卸载扩展以移除扩展本地存储中的全部数据。",
            ],
            type: "list",
          },
        ],
        heading: "7. 你的选择与控制",
      },
      {
        blocks: [
          {
            text: "我们使用浏览器提供的本地存储与扩展隔离机制来降低未授权访问风险。但任何传输或存储方式都无法保证绝对安全。",
            type: "paragraph",
          },
        ],
        heading: "8. 安全性",
      },
      {
        blocks: [
          {
            text: "Wingmon 不面向 13 岁以下儿童，也不会有意收集儿童个人信息。",
            type: "paragraph",
          },
        ],
        heading: "9. 儿童隐私",
      },
      {
        blocks: [
          {
            text: "当你选择外部 AI 服务商时，数据可能会根据该服务商政策在其他国家或地区的服务器上处理。",
            type: "paragraph",
          },
        ],
        heading: "10. 跨境传输",
      },
      {
        blocks: [
          {
            text: "若 Wingmon 接收来自 Google API 的信息，将按照 Google API Services User Data Policy 及其 Limited Use 要求进行处理。",
            type: "paragraph",
          },
        ],
        heading: "11. Google API 服务声明",
      },
      {
        blocks: [
          {
            text: "我们可能会不时更新本政策。更新版本将发布在本页面，并同步更新日期。",
            type: "paragraph",
          },
        ],
        heading: "12. 政策更新",
      },
      {
        blocks: [
          {
            text: "如有隐私相关问题或请求，请通过 Wingmon 在 Chrome Web Store 页面上列出的支持渠道联系开发者。",
            type: "paragraph",
          },
        ],
        heading: "13. 联系方式",
      },
    ],
    title: "Wingmon 隐私权政策",
    updatedAt: "最近更新：2026 年 2 月 19 日（UTC）",
  },
};
