语言选项 / Language Option：

简体中文 | [English](README.md)

---

<img src="https://raw.githubusercontent.com/DamoyY/Wingmon/refs/heads/main/res/logo.svg" width="100">

# Wingmon - 更优雅的浏览体验

Wingmon 是一款浏览器侧边栏扩展，旨在将大语言模型深度集成到浏览体验中。
与其它产品不同，Wingmon 是一个能够访问网页甚至操作浏览器的完整 Agent，而非一个简单的聊天窗口。

---

## Why Wingmon

### AI 不再仅教育用户如何做

通过独有的技术方案，Wingmon 会**以人类的方式**持续操作浏览器，包括点击按钮和链接、打开和关闭标签页、切换标签页等。

我们信任LLM并且赌对了，仅凭借这些基础能力，Wingmon 在实际任务中展现出了良好的生产力。

在信息调查的案例中，Wingmon 做了如下操作：
- 在谷歌搜索引擎中输入搜索词并搜索；
- 点开几个可信的搜索结果；
- 总结搜索结果并关闭标签页；
- 把数据以可视化形式展现给用户；

实际视频：

https://github.com/user-attachments/assets/03e70187-17dc-4a7c-880c-f50fbf59828e

### 简单的场景

更多时候，我们不需要让 AI 代替我们执行什么复杂的操作，只是想询问有关页面上的内容的问题。
得益于端到端的框架设计，Wingmon 同样能完美胜任。
用户只需点击“**携页面发送**”按钮，页面内容便会绕过工具调用直接呈现给 Wingmon，最大程度规避了可能存在的误会。

---

## 我们如何连接 Wingmon 与用户

### 信任
#### Wingmon 没有后端。
为赋予 Agent 足够的能力，尽管已经尽可能让权限最小化，但仍不足以让人放心。
出于对隐私保护的理念：
- **Wingmon 不提供内置模型**
- **Wingmon 没有服务器后端**
- **卸载后一切使用记录都会消失**

Wingmon 目前支持 Chat Competition API、Responses API、Gemini API、Messages API，您可以使用您信任的服务商，甚至本地模型。
在选择模型时，我们推荐的参考标准为 [Tau-2 Bench](https://arxiv.org/abs/2506.07982)。

### 少即是多
我们深知此类产品不应过多地打扰用户的浏览器体验。
- Wingmon 驻留于浏览器的**侧边栏**中，您可以一键打开，也可以一键让它完全退居幕后。当然如果您愿意，Wingmon 也可以在后台中持续为您工作，并在完成任务后提醒您。
- “吵闹”的产品令人厌烦，我们致力于用更小的界面复杂度撬动强大的能力。

---

## 安装与使用方法

Wingmon 是一个开源扩展，您既可以通过 [Chrome Web Store](https://chromewebstore.google.com/category/extensions) 一键安装；也可以从 [Github Release](https://github.com/DamoyY/Wingmon/releases) 下载压缩包并解压后手动安装；或克隆仓库并构建后手动安装。

### 手动安装步骤：
1. 从 Release 界面下载压缩文件解压。
2. 打开 Chrome 或 Edge 浏览器。
3. 在地址栏输入并访问 `chrome://extensions/` 或 `edge://extensions/`。
4. 在页面中开启 **“开发者模式”** 开关。
5. 点击出现的 **“加载未打包的扩展程序”** 按钮。
6. 选择 Wingmon 文件夹。

7. 点击浏览器工具栏上的 Wingmon 图标，打开侧边栏。
8. 首次使用时，您需要填写配置。
9. 点击保存，即可开始与 Wingmon 对话

---

## 更新规划

### 即将加入：
- Reasoning 内容显示。

### 正在评估：
- 用于扩展能力边界的本地可执行文件。

---

## 附录

### 联系方式
有问题或建议请发表 issue，如有意愿参与开发可联系作者邮箱

### 局限
我们需要说明，不是所有模型接入 Wingmon 后都能带来令人满意的表现。

在使用前强烈建议您了解您使用的模型的 Agentic 能力水平。
目前已知可能出现的问题：
- 网络信息搜集能力：

  某些模型可能出现自主使用搜索引擎后不主动点开条目的情况，这很大程度上因为训练过程中的搜索工具是直接返回结果，造成模型对于“搜索”这类操作过拟合。
- 多模态能力：

  由于 Chat Completions API 下工具的返回值只能为文本，当您使用该 API 时 Wingmon 无法自主查看图片。
- 界面功能：

  由于 Gemini API 对思维链进行加密，当您使用该 API 时将无法使用“携页面发送”功能。
