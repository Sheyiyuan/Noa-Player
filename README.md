<div align="center">
	<h1>Noa Studio</h1>
    <p>面向学习与研究场景的视频知识管理工具</p>
	<p><em>「論理を記録する、その一瞬まで。」</em></p>
	<p>
		<img alt="Electron" src="https://img.shields.io/badge/Electron-Desktop-47848F?style=for-the-badge&logo=electron&logoColor=white" />
		<img alt="React" src="https://img.shields.io/badge/React-UI-61DAFB?style=for-the-badge&logo=react&logoColor=0A0A0A" />
		<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
		<img alt="Vite" src="https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
	</p>
	<p>
		<img alt="hls.js" src="https://img.shields.io/badge/hls.js-Streaming-0A1E44?style=for-the-badge" />
		<img alt="Tesseract.js" src="https://img.shields.io/badge/Tesseract.js-OCR-5B8DEF?style=for-the-badge" />
		<img alt="License" src="https://img.shields.io/badge/License-AGPL--3.0-3DA639?style=for-the-badge" />
		<img alt="Platform" src="https://img.shields.io/badge/Platform-Linux%20%7C%20Windows%20%7C%20macOS-5A5A5A?style=for-the-badge" />
	</p>
</div>

---

Noa Studio 不仅仅是一个播放器，它是你的<strong>外部记忆装置</strong>。

它将流媒体播放、AI 辅助分析、OCR 文字提取与时间戳笔记整合为一体，帮助你将稍纵即逝的视频画面转化为可沉淀、可检索、可复用的结构化知识。

## 隐私政策

- 本应用默认在本地设备处理与存储数据（如播放源信息、截图、OCR 结果与导出内容）。
- 用户导入的媒体链接、截图与文本内容由用户自行控制与管理，项目方不主动收集、上传或共享你的本地数据。
- 若你启用第三方服务（如外部 AI 接口或插件能力），相关请求与数据将按该服务提供方的政策处理；请在使用前自行评估其隐私与合规风险。
- 你可通过删除本地应用数据目录、素材文件与导出文件来清理历史数据。

## 免责声明

- 本项目提供通用媒体处理与笔记生产力能力，不针对任何特定平台提供适配承诺。
- 用户应确保对输入的媒体资源、文本与图片拥有合法访问与使用权，并遵守适用法律法规及来源平台条款。
- 对于因第三方服务变更、链接失效、访问限制、版权争议或平台策略调整导致的功能异常或不可用，项目不作可用性保证。
- 本项目按“现状”提供，不对特定用途适配性、持续可用性或结果准确性作明示或默示担保。

## 路线图

- [x] 本地视频/直链播放（播放、暂停、seek、倍速、音量）
- [ ] 时间戳插入与回跳
- [x] 全画面截图 + 框选截图
- [x] OCR 提取与素材卡入库
- [ ] AI OCR 结果优化
- [ ] Markdown 笔记编辑与导出（含 assets）
- [ ] 笔记工程化管理
- [ ] 多视频项目关联
- [ ] 快捷键自定义
- [ ] 素材库搜索增强（文本/标签）
- [ ] 插件能力开放
- [ ] AI 辅助笔记
- [ ] 更强 OCR/ASR 离线模型方案
- [ ] 视频片段 AI 分析转写

## 用户指南

### 产品定位

- 观看视频并进行播放控制（播放、暂停、定位、倍速、音量）
- 在视频时间轴上截图（全画面/区域）
- 对截图执行 OCR，并沉淀为素材
- 结合时间戳进行笔记整理与导出

### 使用说明

- 桌面端使用说明（含播放源输入格式）：[apps/desktop/README.md](apps/desktop/README.md)
- 当前支持本地视频、直链、双轨链接、多分片与 JSON 源配置输入。

支持的 JSON 模板（可直接粘贴到输入框）：

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

字段约束：

- `sources` 为必填数组。
- `sources[].url` 为必填字段，必须是 `http/https` 地址。
- `sources[].track` 为可选字段，支持 `video` / `audio` / `auto`。
- `sources[].headers` 为可选字段，用于附加请求头。
- `duration` 为可选字段，单位为秒，用于初始化进度条。

## 开发者相关

### 技术路线

- 桌面框架：Electron
- 前端：React + TypeScript + Tiptap
- 播放方案：HTML5 Video + hls.js
- OCR：tesseract.js（v0.1）
- i18n：i18next + react-i18next
- 视频画面捕获：Canvas
- 数据存储：SQLite
- 许可协议：AGPL-3.0-or-later（见 [LICENSE](LICENSE)）

### 当前仓库状态

- `apps/desktop` 已完成 Electron + React + Vite 可运行基础框架
- 产品与技术文档已就位（见 `docs/dev`）

### 开发环境快速开始

```bash
pnpm install
pnpm run dev
```

### 目录结构

```text
.
├─ apps/
│  └─ desktop/
├─ docs/
│  └─ dev/
│     ├─ requirements/prd.md
│     ├─ design/design.md
│     └─ test/
├─ package.json
└─ LICENSE
```

### 文档

- PRD（Web-Only 版）：[docs/dev/requirements/prd.md](docs/dev/requirements/prd.md)
- 设计文档（Web-Only 版）：[docs/dev/design/design.md](docs/dev/design/design.md)
- 插件架构设计：[docs/dev/design/plugin-architecture.md](docs/dev/design/plugin-architecture.md)
- 开发路线图（Roadmap）：[docs/dev/roadmap/development-roadmap.md](docs/dev/roadmap/development-roadmap.md)

## License

本项目使用 GNU Affero General Public License v3.0 或更高版本（AGPL-3.0-or-later）。
