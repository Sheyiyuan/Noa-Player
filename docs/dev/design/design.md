# NoaStudio — 设计文档（Design Doc / Web-Only Edition）
版本：v0.4-web-only  
状态：Draft  
目标：定义 NoaStudio 在 Electron + React 纯 Web 播放方案下的核心架构、模块边界、数据结构、插件协议、关键流程与安全策略。

---

## 1. 总体架构
### 1.1 组件划分
- **Electron Main**
  - 生命周期、窗口管理、系统能力封装
  - SQLite、文件系统、导出、日志
  - 管理 Plugin Host 子进程
- **Electron Preload**
  - 向 Renderer 暴露白名单 API（contextBridge）
  - 输入参数校验与权限边界控制
- **Electron Renderer（React + TS）**
  - UI：播放控制、素材库、笔记、导出
  - 播放器：HTML5 Video + hls.js
  - 框选 Overlay 与时间戳交互
- **Plugin Host（Node 子进程）**
  - 插件加载、生命周期管理与能力调用
  - 受控外部命令调用（白名单）

> 原则：Renderer 零高危权限；主进程仅做系统能力封装；播放走浏览器原生能力。

---

## 2. 技术栈
- Electron 32+
- TypeScript 5+
- React 18+
- 构建：Vite
- DB：SQLite（better-sqlite3）
- 图片处理：sharp
- 富文本/Markdown：Tiptap（StarterKit）
- 播放：HTML5 Video + hls.js（可选 dash.js）
- OCR：tesseract.js（MVP）
- i18n：i18next + react-i18next
- 视频画面捕获：Renderer Canvas + Main ffmpeg-static（兜底）
- AI：OpenAI-compatible（fetch/axios）
- 测试：Vitest + Playwright（后续）

### 2.1 库选型建议

#### A. Markdown 编辑框架
- 主选：`@tiptap/react` + `@tiptap/starter-kit`
- 推荐扩展：`@tiptap/extension-link`、`@tiptap/extension-placeholder`、`@tiptap/extension-task-list`、`@tiptap/extension-task-item`、`@tiptap/extension-image`
- Markdown 转换：`remark`（`remark-parse` + `remark-stringify`）用于导入导出；编辑态使用 Tiptap JSON/HTML
- 原因：可扩展性强、与 React 集成成熟，后续做“时间戳节点/素材卡节点”更容易

#### B. 视频播放
- 主选：原生 `<video>` + `hls.js`
- 备选：`dash.js`（仅在必须支持 DASH 时启用）
- 控件层：优先自研轻控制条（减少依赖），如需快速美化可评估 `media-chrome`
- 原因：和 Electron/Web 技术栈匹配，复杂度与维护成本最低

#### C. OCR
- 主选（MVP）：`tesseract.js`（离线、跨平台、前后端都可接）
- 增强方案（v0.2+）：主进程接本地 OCR 服务（如 PaddleOCR/RapidOCR）作为可选高精度通道
- 原因：MVP 先保证可用性，后续再按语言/精度需求切换或双轨

#### D. i18n
- 主选：`i18next` + `react-i18next` + `i18next-browser-languagedetector`
- 命名空间建议：`common`、`player`、`library`、`note`、`settings`
- 原因：生态成熟、类型支持与懒加载方案完善

#### E. 视频画面捕获（截图/帧提取）
- 主选：Renderer 侧 `Canvas`（`drawImage` / `toBlob`）完成实时截图与框选裁剪
- 兜底：Main 侧 `ffmpeg-static` + `execa` 做精确时间点抽帧（用于跨域/解码异常场景）
- 辅助：`sharp` 做缩略图与压缩
- 原因：前端路径速度快；ffmpeg 兜底能覆盖更多边界场景

---

## 3. 建议目录结构
```text
noa-player/
  apps/
    desktop/
      src/
        main/
          index.ts
          ipc/
          services/
        preload/
          index.ts
          api/
        renderer/
          app/
          components/
          stores/
          pages/
      package.json
  docs/
    dev/
      requirements/
      design/
      test/
```

---

## 4. 数据模型（SQLite）
### 4.1 表结构
**sources**
- id TEXT PK
- type TEXT (local|url)
- origin TEXT
- title TEXT
- created_at INTEGER

**clips_assets**
- id TEXT PK
- source_id TEXT FK
- timestamp_ms INTEGER
- image_path TEXT
- thumb_path TEXT
- ocr_text TEXT
- tags TEXT (JSON)
- created_at INTEGER

**notes**
- id TEXT PK
- title TEXT
- content_md TEXT
- created_at INTEGER
- updated_at INTEGER

**note_assets**
- note_id TEXT
- asset_id TEXT
- PRIMARY KEY(note_id, asset_id)

### 4.2 文件布局
- Linux：`~/.local/share/NoaStudio/`
- 子目录：`db.sqlite`, `assets/images`, `assets/thumbs`, `exports`, `logs`, `plugins`

---

## 5. IPC 与安全策略
### 5.1 安全基线
- `contextIsolation: true`
- `nodeIntegration: false`
- 禁止 Renderer 直接调用系统命令
- Preload 只暴露固定 API

### 5.2 关键通道
- `playback.open(source)`
- `playback.control({ action, value })`
- `playback.state()`
- `capture.full()` / `capture.region(region)`
- `ocr.run(imagePath, lang)`
- `integration.copyText(payload)` / `integration.copyImage(assetId)`
- `plugins.invoke(pluginId, action, payload)`
- `ai.runText(task, text, configId)`
- `export.session(sessionId, options)`

---

## 6. 播放策略（重点）
### 6.1 浏览器播放能力
- 本地文件：`<video>` + `File/Blob URL`
- HTTP/HTTPS 直链：`<video src>`
- HLS：优先 `hls.js`，浏览器原生支持时直接播放
- DASH：v0.1 非强制（可后续评估 `dash.js`）

### 6.2 截图策略
- 同源/可跨域读取场景：Canvas 抓帧
- 不可跨域读取场景：提示限制并提供“下载后本地打开”降级路径

### 6.3 播放抽象
```ts
interface PlaybackPort {
  open(source: SourceDescriptor): Promise<void>
  pause(paused: boolean): Promise<void>
  seekMs(ms: number, mode?: "absolute" | "relative"): Promise<void>
  setSpeed(rate: number): Promise<void>
  setVolume(vol: number): Promise<void>
  screenshot(path: string): Promise<void>
  subscribe(cb: (event: PlaybackEvent) => void): () => void
}
```

---

## 7. 插件系统（Plugin Runtime）
### 7.1 manifest
```json
{
  "id": "example.plugin",
  "name": "Noa Example Plugin",
  "version": "0.1.0",
  "type": "runtime-plugin",
  "permissions": { "network": true, "exec": false },
  "capabilities": ["transform.text", "analyze.media"]
}
```

### 7.2 接口
```ts
interface RuntimePlugin {
  id: string
  capabilities: string[]
  execute(input: { action: string; payload: unknown }): Promise<unknown>
}
```

### 7.3 权限
- `network`：网络请求
- `exec`：外部命令（需用户授权 + 白名单）

> 插件运行时的详细规范见：`docs/dev/design/plugin-architecture.md`

---

## 8. 关键流程
1) Renderer 输入 URL
### 8.1 来源播放
1) Renderer 输入来源（本地文件或直链）
2) Renderer 调播放器 `open`
3) Main 侧记录来源元数据
4) Renderer 更新状态并同步到笔记/素材流程

### 8.2 截图→OCR→剪贴板
1) Renderer 触发截图
2) Renderer 抓帧并通过 IPC 请求落盘
3) Main 生成素材卡 + 缩略图 + 入库
4) OCR 可选执行并回写
5) Renderer 生成模板文本并复制到系统剪贴板

### 8.3 导出
1) 读取 session + asset 关系
2) 复制 assets
3) 输出会话摘要 Markdown 文件

---

## 9. 测试策略
- 单元测试：服务层与 IPC 参数校验
- 集成测试：播放控制、截图、导出
- 手工验证：Wayland/X11 UI 行为一致性
- 可用性基线：新增 Web 播放能力测试（含跨域截图限制验证）

---

## 10. 里程碑
- M1：Electron 基础骨架 + 浏览器播放控制 + 截图
- M2：框选 + 素材库 + OCR
- M3：剪贴板复制 + 时间戳回跳 + 导出
- M4：插件框架 + AI 文本处理
- M5：打包发布 + 稳定性优化

---

## 11. 编辑器实现参考（Novel）

### 11.1 参考范围与原则
- 参考对象：`steven-tey/novel` 的编辑体验与模块组织方式
- 仅参考：架构思路、交互模式、扩展拆分策略
- 不直接复制：业务代码、样式细节与品牌设计
- 必须适配：NoaStudio 的时间戳、素材卡、IPC 导出与播放器联动

### 11.2 推荐模块拆分（Renderer）
```text
src/
  editor/
    core/
      editor.ts
      extensions.ts
      schema.ts
    extensions/
      timestamp.ts
      asset-card.ts
      slash-command.ts
      ai-assistant.ts
    ui/
      editor-shell.tsx
      toolbar.tsx
      bubble-menu.tsx
      slash-menu.tsx
    serialization/
      to-markdown.ts
      from-markdown.ts
```

### 11.3 NoaStudio 专有扩展定义
- `timestamp` 节点：保存 `ms/sourceId/label`，点击触发播放器 seek
- `asset-card` 节点：保存 `assetId/imagePath/ocrText`，支持回跳与替换
- `slash-command`：输入 `/` 插入时间戳、素材卡、OCR 片段、AI 操作
- `ai-assistant`：对选区文本触发 summarize/translate 并回写

### 11.4 数据与导出链路
- 编辑态：Tiptap JSON（便于扩展节点）
- 存储态：`notes.content_md` 为主，补充 `notes.content_json` 作为可选缓存
- 导入：Markdown -> Tiptap JSON（`remark` + 自定义节点映射）
- 导出：Tiptap JSON -> Markdown（确保时间戳和素材引用可还原）

### 11.5 分阶段实施
- Phase A：编辑器壳 + 基础扩展（paragraph/heading/list/code/link/image）
- Phase B：时间戳节点 + 素材卡节点 + 播放器回跳
- Phase C：Slash 命令与 AI 入口
- Phase D：Markdown 双向转换与导出一致性测试

> 详细排期与工单粒度拆分见：`docs/dev/roadmap/development-roadmap.md`
