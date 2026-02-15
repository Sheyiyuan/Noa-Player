# NoaStudio — 需求文档（PRD / Web-Only Edition）
版本：v0.4-web-only  
状态：Draft  
产品代号：NoaStudio  
目标平台：跨平台（Linux、Windows、macOS）  
形态：桌面独立应用（Electron）  
UI 技术：React + TypeScript  
播放方案：HTML5 Video + hls.js
平台链接：插件实现（默认不内置特定平台解析）  
AI：OpenAI-compatible API（用户可指向第三方或本地自部署服务）

---

## 1. 背景与问题
用户在 YouTube/B 站等平台学习或整理资料时，常见痛点：
- 关键信息分散在时间轴，难以快速摘录、回看与复用
- 截图、OCR、转写、笔记通常依赖多工具，流程割裂
- Web 方案受 CORS 与媒体安全策略限制，影响取帧与截图工作流
- 若要求“单窗口 + 本地高控制力”，Web 技术栈实现成本高且上限受限

NoaStudio 目标：提供“看视频 → 结构化提取信息 → 沉淀 Markdown 笔记”的一体化工作台。

---

## 2. 产品定位
- **生产力播放器工作台**：围绕时间戳、截图/框选、OCR、转写、AI 与导出形成闭环。
- **纯 Web 播放链路**：Electron 主壳 + 浏览器原生媒体能力，避免 Wayland 原生嵌入复杂度。
- **插件化来源解析**：平台链接解析由插件接入，降低主仓合规与维护风险。
- **Linux 体验优先**：先保证 Linux 可用性、稳定性和打包分发。

---

## 3. 目标用户与场景
### 3.1 用户画像
- 开发者/自学者：学习技术视频并沉淀可检索笔记
- 内容研究者：快速抽取关键帧与引用证据
- 学术/语言学习者：字幕对照、片段复听、文本提取

### 3.2 核心场景（Top）
1) 粘贴链接或打开本地视频 → 播放 → 一键截图附带时间戳 → OCR → 写入素材卡 → 导出 Markdown  
2) 框选截图（只截代码区或讲义区）→ OCR → 插入笔记  
3) 片段转写（30s/2min）→ 得到文本 → AI 总结/提问 → 写入笔记  
4) 点击笔记中的时间戳，回跳播放器复习对应片段

---

## 4. 产品目标与成功指标
### 4.1 MVP 目标（v0.1）
- Linux 上稳定可用的本地/直链播放
- 截图/框选 → 素材卡 → Markdown 导出闭环
- 插件系统可运行：内置本地/直链 Provider，平台解析由外部插件承担
- AI Provider 可配置，支持对 OCR/转写文本执行至少一种处理任务

### 4.2 指标（可观测）
- 首次成功播放率（本地+直链）≥ 95%
- 截图成功率 ≥ 99%，截图 P95 < 1s（不含 OCR/AI）
- OCR 可读文本产出率 ≥ 85%
- 导出 Markdown 在 Obsidian/Typora 打开无异常

---

## 5. 范围（Scope）
### 5.1 必须（MVP）
- 播放器：打开本地文件、直链；提供播放/暂停、seek、倍速、音量
- 时间戳系统：一键插入当前播放时间到笔记/素材
- 截图：
  - 全画面截图（Canvas / ImageBitmap）
  - 框选截图（Renderer Overlay + Canvas/Pillow 裁剪）
  - 复制到剪贴板、保存到素材库
- OCR：
  - 对素材图执行 OCR（默认 Tesseract）
  - OCR 文本可编辑、可复制
- 素材库：图、OCR、来源、时间戳、标签、检索
- 笔记：Markdown 编辑与素材引用插入
- 导出：Markdown + assets 文件夹
- 插件系统：SourceProvider 协议 + 本地插件加载机制
- AI Provider：OpenAI-compatible（base_url/api_key/model）

### 5.2 应该（v0.2）
- 片段转写（离线/半离线）
- 多视频项目关联
- 快捷键自定义

### 5.3 可以（v0.3+）
- 实时转写字幕层
- 词级时间戳对齐
- 插件市场/自动更新
- 离线 OCR/ASR 模型增强

### 5.4 不做（MVP）
- 主程序内置 YouTube/B 站解析逻辑
- DRM 播放能力保证
- 云同步与账号体系

---

## 6. 功能需求（FR）
### 6.1 播放与来源
- FR-PL-01：支持本地视频文件播放
- FR-PL-02：支持直链播放（mp4/webm/m3u8；DASH 视浏览器能力）
- FR-PL-03：显示当前时间、总时长（可得时）
- FR-PL-04：倍速（0.25~3.0）、seek（±5s/±30s）、音量、静音
- FR-PL-05：来源信息入库：sourceId/origin/title

### 6.2 截图与框选
- FR-CAP-01：一键截图当前帧，输出 PNG
- FR-CAP-02：框选截图（覆盖层拖拽选区）
- FR-CAP-03：截图自动生成素材卡（带时间戳）
- FR-CAP-04：支持复制图片到系统剪贴板
- FR-CAP-05：截图命名规则可配置

### 6.3 OCR
- FR-OCR-01：素材图执行 OCR 并回写文本
- FR-OCR-02：OCR 文本可编辑、复制
- FR-OCR-03：OCR 语言配置（默认 `en+zh`）
- FR-OCR-04：OCR 失败可重试并有日志

### 6.4 素材库
- FR-LIB-01：素材字段：id/image_path/ocr_text/source_ref/timestamp_ms/tags/created_at
- FR-LIB-02：按 OCR 文本、标题、标签检索
- FR-LIB-03：素材卡点击回跳对应时间

### 6.5 笔记与导出
- FR-NOTE-01：Markdown 笔记支持素材引用块
- FR-NOTE-02：时间戳链接驱动播放器 seek
- FR-EXP-01：导出 Markdown + assets
- FR-EXP-02：导出包含来源信息、素材引用、时间戳

### 6.6 插件系统（来源解析）
- FR-PLG-01：支持本地插件目录加载
- FR-PLG-02：插件 manifest 声明 id/version/permissions/match
- FR-PLG-03：URL 输入后按 match 选择 provider 并 resolve
- FR-PLG-04：插件错误可见且不拖垮主进程

### 6.7 AI Provider
- FR-AI-01：可配置 base_url/api_key/model
- FR-AI-02：支持 summarize / bullets / translate 至少一项
- FR-AI-03：结果可插入笔记并复制
- FR-AI-04：支持禁用 AI 的离线模式

---

## 7. 非功能需求（NFR）
- NFR-01：Linux Wayland/X11 下保持一致 UI 交互体验
- NFR-02：冷启动 < 5s；本地文件播放启动 < 2s
- NFR-03：插件与主程序故障隔离，日志可追溯
- NFR-04：插件权限最小化与显式授权
- NFR-05：本地数据可迁移（导出/备份/恢复）
- NFR-06：Renderer 不直接持有高风险权限，所有系统能力经 preload 白名单暴露

---

## 8. 合规与风险
- 平台解析存在 ToS 风险：主程序仅提供插件接口，不内置平台解析实现
- DRM 内容不保证播放：UI 显式提示不可播放并给出降级指引
- 外部命令执行有安全风险：插件声明权限 + 白名单执行 + 超时与输出限制

---

## 9. 功能路线图
### v0.1（MVP）
- 本地视频/直链播放（播放、暂停、seek、倍速、音量）
- 时间戳插入与回跳
- 全画面截图 + 框选截图
- OCR 提取与素材卡入库
- Markdown 笔记编辑与导出（含 assets）

### v0.2
- 片段转写（30s/2min）
- 多视频项目关联
- 快捷键自定义
- 素材库搜索增强（文本/标签）

### v0.3+
- 实时转写字幕层
- 词级时间戳对齐
- 插件市场与自动更新
- 更强 OCR/ASR 离线模型方案

---

## 10. 关键决策与开放问题
- 浏览器播放限制：跨域视频可能导致截图受限，需提供可见提示与降级路径
- OCR 默认引擎：Tesseract（快落地）或 PaddleOCR（更强但依赖重）
- 插件隔离级别：进程级隔离是否在 v0.1 强制落地
- 数据目录策略：默认全局目录 vs 项目工作区目录
