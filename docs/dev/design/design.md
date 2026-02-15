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
  - SourceProvider 插件加载与 URL 解析
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
- 播放：HTML5 Video + hls.js
- OCR：Tesseract（MVP）
- AI：OpenAI-compatible（fetch/axios）
- 测试：Vitest + Playwright（后续）

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
- `plugins.resolveUrl(url)`
- `ai.runText(task, text, configId)`
- `export.markdown(noteId, options)`

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

## 7. 插件系统（SourceProvider）
### 7.1 manifest
```json
{
  "id": "example.direct",
  "name": "Direct URL Provider",
  "version": "0.1.0",
  "type": "source-provider",
  "permissions": { "network": true, "exec": false },
  "match": ["^https?://"]
}
```

### 7.2 接口
```ts
interface SourceProvider {
  id: string
  match(url: string): boolean
  resolve(input: { url: string }): Promise<ResolveResult>
}
```

### 7.3 权限
- `network`：网络请求
- `exec`：外部命令（需用户授权 + 白名单）

---

## 8. 关键流程
### 8.1 URL 播放
1) Renderer 输入 URL
2) Main 调 Plugin Host `resolveUrl`
3) Renderer 选 source 并调用前端播放器 `open`
4) Renderer 更新状态并同步到笔记/素材流程

### 8.2 截图→OCR→笔记
1) Renderer 触发截图
2) Renderer 抓帧并通过 IPC 请求落盘
3) Main 生成素材卡 + 缩略图 + 入库
4) OCR 可选执行并回写
5) Renderer 插入引用与时间戳

### 8.3 导出
1) 读取 note + asset 关系
2) 复制 assets
3) 输出 Markdown 文件

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
- M3：笔记编辑 + 时间戳回跳 + 导出
- M4：插件框架 + AI 文本处理
- M5：打包发布 + 稳定性优化
