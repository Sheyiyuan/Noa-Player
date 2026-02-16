# @noa-player/desktop

NoaStudio 桌面端基础框架（Electron + React + Vite + TypeScript）。

## 目录

```text
apps/desktop
├─ electron/
│  ├─ main.mjs
│  └─ preload.mjs
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ styles.css
│  └─ vite-env.d.ts
├─ index.html
├─ tsconfig.json
└─ vite.config.ts
```

## 常用命令

```bash
# 在仓库根目录执行
pnpm install
pnpm --filter @noa-player/desktop run dev
pnpm --filter @noa-player/desktop run build
```

## 下一步建议

- 建立 IPC 通道（播放、截图、OCR、导出）
- 增加状态管理与路由骨架
- 接入 SQLite 数据层与项目文件模型

## IPC 骨架（已接入）

- main 端注册：`electron/ipc/register-handlers.mjs`
- preload 桥接：`electron/preload.mjs`
- renderer 类型：`src/ipc.ts`

当前通道：

- `noa:app:ping`
- `noa:app:getVersions`
- `noa:notes:exportMarkdown`（占位实现）

## 推荐库（下一步实施）

- Markdown 编辑：Tiptap（`@tiptap/react` + `@tiptap/starter-kit`）
- Markdown 导入导出：`remark-parse` + `remark-stringify`
- 视频播放：`hls.js`（可选 `dash.js`）
- OCR：`tesseract.js`（MVP）
- i18n：`i18next` + `react-i18next` + `i18next-browser-languagedetector`
- 视频画面捕获：Renderer Canvas + Main `ffmpeg-static`（兜底）+ `sharp`（后处理）
