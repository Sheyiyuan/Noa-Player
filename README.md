# NoaStudio (Noa-Player)

NoaStudio 是一个基于 Web 技术栈的桌面视频生产力工具，目标是把“看视频 → 截图/OCR → 时间戳笔记 → Markdown 导出”做成闭环。

## 技术路线（当前）

- 桌面框架：Electron
- 前端：React + TypeScript + Tiptap
- 播放方案：HTML5 Video + hls.js（不使用 mpv）
- OCR：tesseract.js（v0.1）
- i18n：i18next + react-i18next
- 视频画面捕获：Canvas（主路径）+ ffmpeg-static（兜底）
- 数据存储：SQLite
- 许可协议：AGPL-3.0-or-later（见 [LICENSE](LICENSE)）

## 当前仓库状态

- `apps/desktop` 已完成 Electron + React + Vite 可运行基础框架
- 产品与技术文档已就位（见 `docs/dev`）

## 快速开始（骨架）

```bash
pnpm install
pnpm run dev
```

## 路线图

### v0.1（MVP）

- [ ] 本地视频/直链播放（播放、暂停、seek、倍速、音量）
- [ ] 时间戳插入与回跳
- [ ] 全画面截图 + 框选截图
- [ ] OCR 提取与素材卡入库
- [ ] Markdown 笔记编辑与导出（含 assets）

### v0.2

- [ ] 片段转写（30s/2min）
- [ ] 多视频项目关联
- [ ] 快捷键自定义
- [ ] 素材库搜索增强（文本/标签）

### v0.3+

- [ ] 实时转写字幕层
- [ ] 词级时间戳对齐
- [ ] 插件市场与自动更新
- [ ] 更强 OCR/ASR 离线模型方案

## 目录结构

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

## 文档

- PRD（Web-Only 版）：[docs/dev/requirements/prd.md](docs/dev/requirements/prd.md)
- 设计文档（Web-Only 版）：[docs/dev/design/design.md](docs/dev/design/design.md)
- 插件架构设计：[docs/dev/design/plugin-architecture.md](docs/dev/design/plugin-architecture.md)
- 开发路线图（Roadmap）：[docs/dev/roadmap/development-roadmap.md](docs/dev/roadmap/development-roadmap.md)

## License

本项目使用 GNU Affero General Public License v3.0 或更高版本（AGPL-3.0-or-later）。
