# @noa-studio/desktop

Noa Studio 桌面端基础框架（Electron + React + Vite + TypeScript）。

## 目录

```text
apps/desktop
├─ electron/
│  ├─ main.mjs
│  ├─ preload.mjs
│  └─ ipc/
│     ├─ channels.mjs
│     ├─ register-handlers.mjs
│     ├─ ipc-response.mjs
│     ├─ app-error.mjs
│     └─ validators.mjs
├─ src/
│  ├─ app/
│  ├─ features/
│  ├─ shared/
│  ├─ main.tsx
│  ├─ ipc.ts
│  ├─ styles.css
│  └─ vite-env.d.ts
├─ tests/
│  └─ ipc-response.test.ts
├─ index.html
├─ tsconfig.json
├─ vitest.config.ts
└─ vite.config.ts
```

## 常用命令

```bash
# 在仓库根目录执行
pnpm install
pnpm --filter @noa-studio/desktop run dev
pnpm --filter @noa-studio/desktop run build
pnpm --filter @noa-studio/desktop run lint
pnpm --filter @noa-studio/desktop run test
```

## 使用说明：播放源输入格式

播放器输入框当前支持以下格式：

- 单链接直链
	- 支持常见可播放地址（如 mp4、webm、m3u8、mpd）。
- 双轨链接（音视频分离）
	- 每行一个 URL，共两行。
	- 可选前缀：`v:`/`video:` 表示视频轨，`a:`/`audio:` 表示音频轨。
- 多分片 m4s
	- 每行一个 URL。
	- 建议使用前缀显式标注轨道（`v:` / `a:`）。
- JSON 源配置（推荐）
	- 支持精简结构，示例：

```json
{
	"title": "示例视频",
	"duration": 123.45,
	"sources": [
		{
			"url": "https://example.com/video.mp4",
			"track": "video",
			"headers": {
				"Referer": "https://example.com",
				"Origin": "https://example.com"
			}
		},
		{
			"url": "https://example.com/audio.m4a",
			"track": "audio"
		}
	]
}
```

字段说明：

- `title`：可选，视频标题。
- `duration`：可选，秒单位时长，用于初始化进度条。
- `sources`：必填，播放源数组。
- `sources[].url`：必填，媒体地址。
- `sources[].track`：可选，`video` / `audio` / `auto`。
- `sources[].headers`：可选，请求头键值对（用于需要鉴权头的媒体地址）。

## 下一步建议

- 建立 IPC 通道（播放、截图、OCR、导出）
- 增加状态管理与路由骨架
- 接入 SQLite 数据层与项目文件模型

## IPC 骨架（已接入）

- main 端注册：`electron/ipc/register-handlers.mjs`
- preload 桥接：`electron/preload.mjs`
- renderer 类型与调用：`src/ipc.ts` + `src/shared/ipc/contracts.ts`

当前通道：

- `noa:app:ping`
- `noa:app:getVersions`
- `noa:export:session`（会话导出主通道）
- `noa:notes:exportMarkdown`（历史兼容占位，待移除）

统一响应：

- success: `{ ok: true, data }`
- failure: `{ ok: false, error: { code, message, details? } }`

参数校验基线：

- 在主进程通过 `validate*Payload` 函数统一校验
- 新增通道可复用 `wrapIpcHandler({ validate, handle })` 模板

## Phase 0 状态管理基线

已接入 `zustand` 并定义最小 store：

- 播放状态：`src/shared/state/playback-store.ts`
- 编辑器状态：`src/shared/state/editor-store.ts`
- 素材状态：`src/shared/state/asset-store.ts`

## 测试与 CI

- Vitest 入口：`vitest.config.ts`
- 基础测试示例：`tests/ipc-response.test.ts`
- CI：仓库根目录 `.github/workflows/ci.yml`（`lint + build`）

## 推荐库（下一步实施）

- 视频播放：`hls.js`（可选 `dash.js`）
- OCR：`tesseract.js`（MVP）
- 剪贴板：Electron `clipboard` API（文本/图片）
- 导出：`remark-stringify`
- i18n：`i18next` + `react-i18next` + `i18next-browser-languagedetector`
- 视频画面捕获：Renderer Canvas + Main `ffmpeg-static`（兜底）+ `sharp`（后处理）
