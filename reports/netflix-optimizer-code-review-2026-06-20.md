# Netflix Optimizer 代码审查报告 - 2026-06-20

## 审查范围

本次审查基于当前 26.6.20 版本，以及已经完成的“按实际码率选择最高项”修复。审查分成 10 个重点方向：manifest/DNR 行为、设置注入、码率自动选择、patched playercore 行为、UI、平台检测、发布清洁度、合规风险、打包流程和可维护性。

可加载的扩展运行文件已经迁移到：

```text
/Users/zdf/Documents/zdfporjects/netflixoptimizer/src
```

以后在 Chrome 或 Edge 里加载 unpacked extension 时，请选择这个 `src` 文件夹。

## 总体结论

最近的最高码率修复方向是正确的：现在会按数字比较实际码率，而不是依赖 Netflix 菜单顺序。剩余最重要的风险不在这次修复本身，而在扩展整体架构上：

1. 捆绑的 patched `cadmium-playercore` 很可能就是你记得的“引用别人代码/第三方代码”风险点。
2. DNR 重定向规则比实际需要更宽。
3. patched playercore 仍然读取旧的 settings 元素 id，如果 `window.globalOptions` 在 manifest transform 之前没有初始化，存在失败风险。
4. `netflix_maxrate.js` 在 `document.body` 尚不存在时可能抛错。
5. 发布版本里仍然包含 debug logs 和显式的 `MARKER_PROFILES` 标记。

## 后续处理记录

在本报告生成后，已按短期低风险路线处理以下事项：

1. patched playercore 头部现在同时支持 `netflix-optimizer-settings` 和旧的 `netflix-1080p-settings`，并提供默认设置。
2. DNR 规则已限制为 `script` 资源类型。
3. `netflix_maxrate.js` 会等待 `document.body` 存在后再创建 `MutationObserver`。
4. 扩展自己添加的发布版 debug 输出已移除或放到 `DEBUG=false` 后面。
5. 新增 `scripts/package.sh`，从 `src/` 白名单生成干净发布包。

## 发现的问题

### P1 - 捆绑 patched Netflix Playercore 存在商城、版权和维护风险

证据：

- `src/cadmium-playercore-6.0052.717.`911-patched.js 是一个 4.4 MB 的捆绑、压缩/混淆播放器文件。
- `src/redirect_rules.json:7`、`src/redirect_rules.json:18`、`src/redirect_rules.json:29` 会把 Netflix player URL 重定向到这个本地文件。
- `src/content_loader.js:3` 写着实现基于 "New Netflix 1080p (1.33.0_0)"。

为什么重要：

这个文件看起来是在重新分发并修改 Netflix 的 playercore，而 Netflix playercore 很可能是专有代码。它也可能带来 Chrome Web Store 审核风险，因为大型第三方/混淆代码很难审核，商城审核人员可能会要求说明所有权、许可证或来源。这不是法律意见，但它是最符合你记忆里那个风险点的地方。

建议：

- 把它当成最高优先级的发布风险。
- 保留 provenance 说明：playercore 来源、修改内容、为什么需要捆绑。
- 如果可靠性允许，考虑改成小型 runtime patcher，只修改已知字符串/对象，而不是捆绑完整 playercore。
- 如果发布到商城，要准备好可能被拒或被要求补充说明。

### P1 - DNR 重定向规则过宽

证据：

- `src/redirect_rules.json:10`、`src/redirect_rules.json:21`、`src/redirect_rules.json:32` 匹配的是较宽泛的 player HTML 路径。
- 规则没有限制 `resourceTypes` 为 script。
- 规则没有精确匹配 `cadmium-playercore` 脚本文件名。

为什么重要：

过宽的重定向可能会把同一路径下的非 playercore 资源也重定向到 JavaScript 文件。如果 Netflix 资源路径变化，或者 URL filter 命中了 HTML/bootstrap 资源而不是目标 playercore script，就可能导致 Netflix 播放页异常。

建议：

- 给每条 condition 添加 `"resourceTypes": ["script"]`。
- 尽可能收窄到实际 playercore 文件名/路径；如果 `urlFilter` 不够精确，可以考虑 `regexFilter`。

### P1 - Patched Playercore 仍然读取旧 settings 元素 id

证据：

- `src/content_loader.js:20` 写入的是 `netflix-optimizer-settings`。
- `src/netflix_maxrate.js:303` 已经兼容 `netflix-optimizer-settings` 和 `netflix-1080p-settings`。
- `src/cadmium-playercore-6.0052.717.911-patched.js:3` 只读取 `netflix-1080p-settings`。
- `src/cadmium-playercore-6.0052.717.911-patched.js:23040` 附近的 profile 逻辑直接访问 `window.globalOptions`。

为什么重要：

如果 maxrate 脚本还没有在 playercore manifest transform 之前初始化 `window.globalOptions`，patched playercore 读取 `disableVP9` 等字段时可能抛错。当前流程通常能工作，是因为注入的 maxrate 脚本最终会初始化 `window.globalOptions`，但 playercore 不应该依赖这个加载顺序竞态。

建议：

- 修改 playercore 头部，让它同时读取两个 id。
- settings 元素缺失时，提供内置默认值。
- 更理想的方式是先注入一个小 helper，例如 `window.netflixOptimizerGetOptions()`，再让 playercore 读取它。

### P1 - `netflix_maxrate.js` 在 `document.body` 不存在时可能失败

证据：

- `src/netflix_maxrate.js:366` 调用 `observer.observe(document.body, ...)`。
- 这个脚本由 `document_start` 的 content script 注入，见 `src/manifest.json:30`。

为什么重要：

在 `document_start` 阶段，`document.body` 可能还是 `null`。如果此时执行 `observer.observe(null, ...)`，脚本会抛错，当前 document 的自动码率功能会停止。

建议：

- 创建 observer 前等待 `document.body` 存在。
- 或者先 observe `document.documentElement`，之后再切换到 body。

### P2 - Watch 页面检测过宽

证据：

- `src/netflix_maxrate.js:8` 匹配了 `watch`、`browse`、`title` 和 `latest`。
- 初始自动执行逻辑在 `src/netflix_maxrate.js:372` 根据 `isWatchPage(currentUrl)` 启动。

为什么重要：

码率 override 菜单只在播放时有意义。在 browse/title/latest 页面运行 retry 会产生不必要的工作、混乱日志，并且如果 Netflix 改变快捷键处理方式，可能带来隐藏菜单副作用。

建议：

- 自动码率执行只限制在 `/watch/`。
- 如果 browse/title/latest 只是用于 SPA 导航检测，可以继续监听这些页面，但只在导航进入 `/watch/` 后调用 `maxbitrate_start()`。

### P2 - 精确文本 XPath 匹配较脆弱

证据：

- `src/netflix_maxrate.js:60` 使用 `//div[text()="..."]`。
- `src/netflix_maxrate.js:79` 使用 `//button[text()="..."]`。

为什么重要：

只要 Netflix 的文本出现空格、嵌套 span、大小写变化、标点变化或新的本地化字符串，自动化就可能找不到元素。这在 Netflix UI 上很容易发生。

建议：

- 使用 `normalize-space(.)` 替代 `text()`。
- 优先找到 `.player-streams` 容器，再按已知顺序选择其中的 `select`。
- 标签匹配可以保留为 fallback，而不是唯一路径。

### P2 - 发布版本仍包含 debug logs 和 patch marker

证据：

- `src/cadmium-playercore-6.0052.717.911-patched.js:23021`、`src/cadmium-playercore-6.0052.717.911-patched.js:23085`、`src/cadmium-playercore-6.0052.717.911-patched.js:23087`、`src/cadmium-playercore-6.0052.717.911-patched.js:148938` 会输出内部状态。
- `src/cadmium-playercore-6.0052.717.911-patched.js:23023` 包含 `MARKER_PROFILES`。
- `src/content_loader.js:22` 和 `src/content_loader.js:43` 会输出 settings 和注入脚本。
- `src/netflix_maxrate.js:307`、`src/netflix_maxrate.js:330`、`src/netflix_maxrate.js:340`、`src/netflix_maxrate.js:354` 会输出运行状态。

为什么重要：

debug log 对测试有用，但发布版本里会制造额外噪音。settings 本身不敏感，但仍然属于可以避免的诊断输出。

建议：

- 用一个默认 `false` 的 `DEBUG` 常量控制日志。
- 除非 `MARKER_PROFILES` 被外部 patcher 依赖，否则发布版本应移除。

### P2 - 平台检测可能夸大能力

证据：

- `src/background.js:7` 把任何非 Mac 的 Edge UA 都当成 Windows Edge。
- `src/background.js:15` 将 Windows Edge 标记为 `can4K: true`。

为什么重要：

Linux Edge、非标准 Chromium、旧 Windows、缺失 HEVC 扩展、HDCP 不满足或 DRM 问题，都可能导致 popup 显示 4K HDR ready，但 Netflix 实际无法播放 4K HDR。

建议：

- 使用 `chrome.runtime.getPlatformInfo()` 区分 OS 和浏览器。
- popup 文案更保守，例如：“Platform supports 4K when DRM/HDCP requirements are met.”
- 可以提示用户实际播放能力需要用 `Control/Shift/Alt+D` 确认。

### P3 - 设置变更通常需要刷新页面，但 UI 没提示

证据：

- `src/content_loader.js:25` 只在页面注入时读取一次 settings。
- `src/popup.js:37` 和 `src/pages/options.js:18` 保存设置后没有通知已打开的 Netflix tab。

为什么重要：

用户切换 AV1/VP9/audio 选项后，可能期望当前 Netflix 播放页立刻生效。但实际上 settings 通常只在页面上下文初始化和 manifest 请求阶段生效，所以需要刷新或重新打开播放页。

建议：

- 保存设置后显示短提示：“Reload Netflix tab to apply”。
- 可选：向匹配的 Netflix tab 发送消息，在用户确认后刷新。

### P3 - `src/` 迁移后，手工打包容易漂移

证据：

- 发布包目前是手工白名单创建的。
- 扩展现在已经迁到 `src/`。

为什么重要：

手工打包在目录结构变化后很容易出错：未来 zip 可能误包含根目录文件、漏掉已移动文件，或者打进旧的 dist 目录。

建议：

- 添加一个小脚本，例如 `scripts/package.sh`，只打包 `src/` 内容。
- 增加 package 验证步骤，检查 `manifest.json`、预期文件、并确认没有 `.DS_Store`、`.git`、`reports`、`dist`、`_metadata`。

## 十轮审查摘要

1. Manifest 和权限：权限整体较少，但 content script matches 和 web accessible resources 仍然偏宽。
2. DNR 重定向行为：功能上可用，但匹配过宽；建议限制为 script 资源并收窄 playercore 匹配。
3. Settings 流程：popup/options/default settings 一致；playercore 仍有旧 id 和初始化竞态风险。
4. 码率自动化：按数字选择最高码率是正确的；DOM ready 和 label 匹配需要增强。
5. Patched playercore profile 逻辑：profile override 集中、可理解，但直接依赖 `window.globalOptions` 较脆弱。
6. UI/options：popup 和 options 简单可用；保存设置后应提醒用户刷新 Netflix 页面。
7. 平台检测：可作为高层提示，但 4K/HDR ready 的实际条件比 popup 显示更复杂。
8. 发布清洁度：生成的包可以很干净，但源码里仍有 debug logs 和 marker。
9. 商城/合规：捆绑 patched playercore 是最大风险，应记录来源或考虑替代方案。
10. 仓库结构/测试：`src/` 布局更适合加载；下一步建议加可重复打包脚本和 smoke-check 清单。

## 建议修复顺序

1. 修 patched playercore settings 初始化，支持 `netflix-optimizer-settings` 和默认值。
2. 收窄 DNR 规则，只匹配 script/playercore 请求。
3. 让 `netflix_maxrate.js` 等待 `document.body` 后再 observe。
4. 移除或 gate 发布版 debug logs。
5. 为新的 `src/` 布局添加打包脚本。

## 关于 `src/` 迁移

已将可加载扩展运行文件移到 `src/`：

- `manifest.json`
- background/content scripts
- popup/options 文件
- 图标
- DNR rules
- patched playercore

根目录保留、不放进 `src/` 的文件：

- `README.md`
- `privacy.html`
- `reports/`
- `dist/`
- `_metadata/`
- Git 元数据和 ignore 文件

`README.md` 现在已经说明加载 unpacked extension 时选择 `src` 文件夹。
