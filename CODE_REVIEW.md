# Netflix Optimizer v26.3.18 - Code Review

**Review Date:** 2026-03-18  
**Version:** 26.3.18 (v5.0.0)  
**Status:** ✅ 功能正常，最新修复版本

---

## 📋 总体评价

代码结构清晰，功能实现完整。插件通过拦截 Netflix playercore 和强制最高比特率来实现画质优化。整体架构合理，但存在一些可改进的地方。

---

## 🏗️ 架构分析

### 核心组件

| 文件 | 作用 | 状态 |
|------|------|------|
| `manifest.json` | 扩展配置 | ✅ MV3 兼容 |
| `background.js` | 后台服务/消息路由 | ✅ 正常 |
| `content_loader.js` | 内容脚本注入 | ✅ 正常 |
| `netflix_maxrate.js` | 比特率强制 | ✅ 正常 |
| `redirect_rules.json` | 重定向规则 | ✅ 正常 |
| `popup.html/js/css` | 设置界面 | ✅ 正常 |

### 工作流程

```
用户访问 Netflix 
  → content_loader.js 检测页面
  → 注入 netflix_maxrate.js
  → 触发 Ctrl+Alt+Shift+B 打开隐藏菜单
  → 自动选择最高比特率选项
  → 点击 Override 确认
```

---

## ✅ 优点

1. **MV3 兼容性**: 使用 `declarativeNetRequest` 替代已废弃的 `webRequest` blocking
2. **优雅降级**: 有完善的错误处理和 fallback 机制
3. **平台检测**: 详细的浏览器/平台能力检测
4. **用户反馈**: Popup 界面清晰显示当前状态和能力
5. **模块化**: 功能分离清晰，易于维护

---

## ⚠️ 问题与建议

### 1. 代码质量问题

#### `netflix_maxrate.js`

**问题 1.1**: XPath 选择器脆弱
```javascript
const VIDEO_SELECT = getElementByXPath("//div[text()='Video Bitrate / VMAF']");
```
- XPath 依赖精确文本匹配，Netflix 多语言环境下可能失效
- **建议**: 使用更稳定的 data-testid 或 class 选择器

**问题 1.2**: 键盘事件模拟可能不可靠
```javascript
window.dispatchEvent(new KeyboardEvent('keydown', {
    keyCode: 66, // B
    ctrlKey: true,
    altKey: true,
    shiftKey: true,
}));
```
- 某些浏览器/系统可能阻止合成的键盘事件
- `keyCode` 已废弃，应使用 `code` 或 `key`
- **建议**: 添加备用方案（直接操作 DOM）

**问题 1.3**: 轮询间隔过短
```javascript
setInterval(function () {
    // ...
}, 500);
```
- 500ms 轮询在长时间观看时消耗资源
- **建议**: 使用 `MutationObserver` 监听 URL 变化

### 2. 安全性问题

**问题 2.1**: eval 风险
```javascript
window.globalOptions = JSON.parse(settingsEl.innerText);
```
- 虽然当前是内部数据，但建议添加验证
- **建议**: 添加 try-catch 和 schema 验证

### 3. 性能问题

**问题 3.1**: 重复注入
- 每次 URL 变化都会重新触发 `maxbitrate_start`
- **建议**: 添加去重逻辑，避免重复执行

**问题 3.2**: 样式节点泄漏
```javascript
document.head.appendChild(styleNode);
// 虽然有 cleanup，但异常情况下可能泄漏
```
- **建议**: 使用 `WeakRef` 或确保 cleanup 总是执行

### 4. 兼容性问题

**问题 4.1**: 正则表达式过于严格
```javascript
const WATCH_REGEXP = /netflix\.com\/watch\/.*/;
```
- 不支持区域域名 (如 netflix.com/browse)
- **建议**: 扩展匹配模式

---

## 🔧 修复建议优先级

| 优先级 | 问题 | 影响 | 工作量 |
|--------|------|------|--------|
| 🔴 高 | XPath 选择器国际化 | 非英语用户失效 | 中 |
| 🟡 中 | 轮询改 MutationObserver | 性能优化 | 中 |
| 🟡 中 | 键盘事件备用方案 | 兼容性提升 | 低 |
| 🟢 低 | 代码规范化 | 可维护性 | 低 |

---

## 📝 代码规范建议

1. **使用 ES6+ 语法**:
   ```javascript
   // 当前
   var was_set = 0;
   // 建议
   let wasSet = 0;
   ```

2. **添加 JSDoc 注释**:
   ```javascript
   /**
    * 强制设置 Netflix 最高比特率
    * @returns {boolean} 是否成功设置
    */
   function maxbitrate_set() { ... }
   ```

3. **常量集中管理**:
   ```javascript
   const CONFIG = {
     POLL_INTERVAL: 500,
     MAX_RETRIES: 10,
     WATCH_PATTERN: /netflix\.com\/watch\/.*/
   };
   ```

---

## 🎯 功能测试清单

- [x] 1080p 强制
- [x] 4K 检测
- [x] 音频比特率设置
- [x] Popup 状态显示
- [x] 平台兼容性检测
- [x] 多语言支持 (已修复 - 8 种语言)
- [ ] Safari 兼容性 (待验证)

---

## 📊 总结

**整体评分**: 8/10 → **9/10** (修复后)

这是一个功能完整、实现合理的 Chrome 扩展。核心功能（比特率强制）工作正常，代码结构清晰。

### ✅ 已修复问题 (2026-03-18)

| 问题 | 修复方案 | 状态 |
|------|----------|------|
| XPath 国际化 | 多语言标签数组匹配 (8 种语言) | ✅ |
| 键盘事件废弃 API | 使用 code/key + 保留 keyCode 兼容 | ✅ |
| 轮询性能 | 改用 MutationObserver | ✅ |
| 代码规范 | ES6+ 语法、JSDoc、常量集中管理 | ✅ |
| 重复注入风险 | 添加 isProcessing 锁 | ✅ |

### 🎯 剩余建议

- [ ] Safari 兼容性测试
- [ ] 更多语言标签补充（根据用户反馈）

图标已更新为简洁高清的 Netflix 风格设计（见 `img/` 目录）。

---

**Reviewer:** 麦克布特  
**Review Type:** 功能 + 代码质量审查  
**Last Updated:** 2026-03-18 (修复完成)
