# NoaStudio — 详细开发路线图（Development Roadmap）
版本：v0.1-roadmap  
状态：Draft  
更新日期：2026-02-16

---

## 1. 目标与范围
本路线图用于把现有设计与 PRD 转化为可执行开发计划，覆盖：
- Electron 桌面基础能力
- 播放、截图、OCR、笔记、导出主链路
- Tiptap 编辑器（参考 Novel 思路）
- i18n、测试与发布准备

不包含：
- 插件市场上线
- 云同步与账号系统
- DRM 兼容性保证

---

## 2. 交付原则（Definition of Done 总则）
每个阶段完成时必须满足：
- 功能：核心用户路径可演示
- 质量：关键模块有基础自动化测试
- 文档：设计/接口/使用说明同步更新
- 可回归：`pnpm --filter @noa-player/desktop run lint` 与 `build` 通过

---

## 3. 里程碑总览

| 阶段    | 周期（建议） | 目标               | 关键输出                               |
| ------- | ------------ | ------------------ | -------------------------------------- |
| Phase 0 | Week 1       | 工程与规范稳定化   | 目录规范、状态管理基线、日志与错误模型 |
| Phase 1 | Week 2-3     | 播放+截图主链路    | 播放控制、全屏截图、框选截图、素材入库 |
| Phase 2 | Week 4-5     | 编辑器与时间戳体系 | Tiptap 编辑器、时间戳节点、素材卡节点  |
| Phase 3 | Week 6       | OCR 与内容沉淀     | OCR 流水线、素材文本检索、笔记联动     |
| Phase 4 | Week 7       | 导出与 i18n        | Markdown+assets 导出、多语言框架       |
| Phase 5 | Week 8       | 稳定性与发布准备   | 关键回归、性能基线、打包与发布清单     |

---

## 4. 分阶段任务拆解

## Phase 0：工程基建（Week 1）
### 目标
为后续功能开发建立一致的工程边界和可维护性。

### 任务
- 架构
  - 建立 renderer 分层目录：`app` / `features` / `shared`
  - 引入统一错误模型（`AppError` + 错误码）
- 状态管理
  - 选型并接入 `zustand`（或等价轻量方案）
  - 定义播放状态、编辑器状态、素材状态最小 store
- IPC
  - IPC 响应结构统一（`{ ok, data|error }`）
  - 通道命名规范与参数校验基线
- 质量
  - 配置 Vitest 基础测试入口
  - 补充 CI 最小检查（lint + build）

### 验收标准
- 能在不改业务逻辑的前提下新增 feature 模块
- 新增 IPC 通道有模板可复用

---

## Phase 1：播放与捕获主链路（Week 2-3）
### 目标
打通“打开视频 -> 播放控制 -> 截图/框选 -> 素材入库”。

### 任务
- 播放
  - 封装 `PlaybackPort`，支持本地文件/直链/m3u8
  - 集成 `hls.js` 与 fallback 逻辑
  - 完成播放控制：play/pause/seek/rate/volume
- 画面捕获
  - Renderer Canvas 抓帧（全屏）
  - Overlay 框选截图（区域裁剪）
  - 失败降级提示（跨域不可读）
- 素材落盘
  - Main 侧保存图片与缩略图（`sharp`）
  - 建立素材表写入与读取接口

### 验收标准
- 本地视频与直链可稳定播放
- 截图成功率达到 PRD 目标，生成素材卡可见

---

## Phase 2：Tiptap 编辑器主干（Week 4-5）
### 目标
落地可编辑、可插入时间戳/素材卡、可与播放器联动的笔记系统。

### 任务
- 编辑器基础
  - 集成 `@tiptap/react` + `starter-kit`
  - 接入工具栏、Bubble Menu、Slash Menu
- NoaStudio 扩展（参考 Novel 思路实现）
  - `timestamp` 节点：记录 `ms/sourceId/label`
  - `asset-card` 节点：记录 `assetId/imagePath/ocrText`
  - slash 命令：插入时间戳、素材卡、OCR 文本
- 联动
  - 点击时间戳触发播放器 seek
  - 从素材库插入素材卡
- 序列化
  - 建立 Markdown <-> Tiptap 数据映射骨架（`remark`）

### 验收标准
- 编辑器可完成一条标准笔记：正文 + 时间戳 + 素材卡
- 点击时间戳可回跳到对应视频时刻

---

## Phase 3：OCR 流水线（Week 6）
### 目标
让截图内容可检索、可复用、可回写到笔记。

### 任务
- OCR 实现
  - 接入 `tesseract.js`（MVP 语言包 `en+zh`）
  - OCR 任务队列与重试机制
- 数据联动
  - OCR 结果入库并绑定素材
  - 素材搜索支持 OCR 文本检索
- 交互
  - OCR 处理中状态反馈
  - OCR 失败重试与错误展示

### 验收标准
- 任一素材可触发 OCR 并回写
- OCR 文本可被搜索并可插入编辑器

---

## Phase 4：导出与 i18n（Week 7）
### 目标
形成稳定对外交付能力（Markdown 导出）并具备多语言基础。

### 任务
- 导出
  - 实现 `exportMarkdown` 完整路径（选择目录、写文件、复制 assets）
  - 处理时间戳与素材卡 Markdown 语义映射
- i18n
  - 接入 `i18next + react-i18next`
  - 建立命名空间：`common/player/library/note/settings`
  - 落地中英双语最小词条

### 验收标准
- 导出文件可在 Obsidian/Typora 正常打开
- UI 支持中英切换（核心页面）

---

## Phase 5：稳定性与发布准备（Week 8）
### 目标
以 MVP 可发布为标准做收尾。

### 任务
- 稳定性
  - 关键路径回归：播放、截图、OCR、导出
  - 性能基线记录（冷启动、截图耗时、OCR耗时）
- 打包
  - Linux 首发打包流程（AppImage/deb 二选一优先）
  - 发布清单：版本号、changelog、已知问题
- 文档
  - 安装说明、使用手册、常见问题

### 验收标准
- 完成一次端到端演示与安装包验证
- 已知问题清单可追踪

---

## 5. 并行工作流建议

| 工作流            | Owner 建议        | 可并行阶段 |
| ----------------- | ----------------- | ---------- |
| Shell & IPC       | Electron/平台工程 | Phase 0-5  |
| Player & Capture  | 前端多媒体        | Phase 1-3  |
| Editor & Markdown | 前端编辑器        | Phase 2-4  |
| OCR & Search      | 算法/数据         | Phase 3-4  |
| QA & Release      | 测试/发布         | Phase 4-5  |

---

## 6. 风险清单与应对
- 跨域视频截图失败
  - 应对：明确 UI 提示 + 本地下载后打开路径 + ffmpeg 兜底
- OCR 速度慢或识别差
  - 应对：任务队列、缓存、后续可切本地 OCR 服务
- 编辑器序列化不一致
  - 应对：为时间戳/素材卡建立快照测试用例
- 需求膨胀影响 MVP
  - 应对：严格按 Phase 验收，不跨阶段加入高成本特性

---

## 7. Sprint 级任务模板（可直接建工单）
每个工单建议字段：
- 标题：`[PhaseX][Feature] 简要目标`
- 背景
- 任务清单
- 验收标准（可测试）
- 风险与回滚方案
- 关联文档（PRD/Design/IPC）

示例：
- `[Phase2][Editor] 实现 timestamp 节点并支持点击回跳`
- `[Phase1][Capture] 完成 Canvas 全画面截图与素材入库`
- `[Phase4][Export] Markdown 导出保留素材与时间戳语义`

---

## 8. 文档联动
- 需求文档：`docs/dev/requirements/prd.md`
- 设计文档：`docs/dev/design/design.md`
- 本路线图：`docs/dev/roadmap/development-roadmap.md`
