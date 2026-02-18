# Noa Studio — 笔记工程化与无感版本控制方案
版本：v0.1
状态：Draft
更新日期：2026-02-18

---

## 1. 背景与目标

为提升笔记长期可维护性与可回溯性，计划将单条笔记升级为“工程（Project）”概念，并支持一个工程内管理多个视频来源：

- 用户视角：无需学习 Git 命令，只使用“自动保存、历史、回滚”。
- 系统视角：通过 `isomorphic-git` 在后台实现版本化。
- 资源策略：截图图片不进入 Git，仅在文档中以稳定引用方式关联。

核心目标：

1. 笔记文本与工程元数据可版本化、可审计、可回滚。
2. 图片资源独立管理，不造成 Git 仓库膨胀。
3. 支持同一工程组合多个来源视频，并保持引用关系稳定。

---

## 2. 工程目录建议

```text
<project-root>/
  .git/                 # 由 isomorphic-git 管理（用户无感）
  project.json          # 工程元数据（单一真相源）
  docs/                 # Markdown 笔记正文
  assets/               # 截图/素材（二进制，不纳入 Git）
  assets/index.json     # 资源索引（纳入 Git）
  .noa/
    cache/              # 运行缓存（不纳入 Git）
    locks/              # 锁文件（不纳入 Git）
```

说明：

- `docs/` 与 `project.json` 为版本化主内容。
- `assets/` 存放图片原文件，不进入 Git 历史。
- `assets/index.json` 记录图片元信息（哈希、尺寸、引用关系等），进入 Git。

---

## 3. project.json 建议结构（v1，多来源）

```json
{
  "schemaVersion": 1,
  "id": "proj_20260218_xxx",
  "name": "示例工程",
  "createdAt": "2026-02-18T00:00:00.000Z",
  "updatedAt": "2026-02-18T00:00:00.000Z",
  "sources": [
    {
      "sourceId": "src_001",
      "name": "主讲视频",
      "type": "url",
      "value": "https://example.com/video-a",
      "extra": {
        "format": "json",
        "duration": 123.45
      }
    },
    {
      "sourceId": "src_002",
      "name": "补充视频",
      "type": "local",
      "value": "/videos/clip-b.mp4"
    }
  ],
  "activeSourceId": "src_001",
  "plugins": [
    { "id": "noa.example.plugin", "version": "^1.0.0", "enabled": true }
  ],
  "settings": {
    "autosave": true,
    "snapshotIntervalSec": 30,
    "ocrLanguage": "eng+chi_sim"
  },
  "docs": {
    "entry": "docs/index.md",
    "defaultSourceId": "src_001"
  }
}
```

字段原则：

- 必须包含 `schemaVersion`，用于结构校验与后续演进。
- `sources` 为来源列表，支持本地路径、URL、JSON 源配置等混合来源。
- 每个来源必须有稳定的 `sourceId`，供笔记时间戳与素材引用绑定。
- `activeSourceId` 表示当前工作来源，便于播放器与编辑器联动。
- `plugins` 记录依赖与版本范围，保证可复现。

---

## 4. 文档与资源引用模型

### 4.1 文档中只引用 `assetId`

推荐在 Markdown 中使用自定义引用语法或短代码：

```md
![截图](asset://asset_01HXYZ)
```

渲染时通过 `assets/index.json` 解析 `assetId -> 文件路径`。

涉及时间戳时建议写为 `sourceId + timestampMs`，避免多来源工程中出现歧义。

### 4.2 assets/index.json 建议

```json
{
  "version": 1,
  "items": [
    {
      "assetId": "asset_01HXYZ",
      "file": "assets/2026/02/18/asset_01HXYZ.png",
      "sha256": "...",
      "width": 1920,
      "height": 1080,
      "createdAt": "2026-02-18T00:00:00.000Z",
      "refs": ["docs/index.md#L42"]
    }
  ]
}
```

---

## 5. 无感版本控制流程（isomorphic-git）

## 5.1 初始化

1. 创建工程目录与基础文件。
2. 初始化 Git 仓库（默认分支可配置，如 `main`）。
3. 写入项目级 `.gitignore`（忽略 `assets/` 二进制和 `.noa/cache`）。

## 5.2 自动快照（推荐）

触发时机（任一）：

- 用户停止输入 N 秒（debounce）
- 切换来源/切换文档
- 新增或删除素材引用
- 手动“创建快照”

快照步骤：

1. 刷新 `assets/index.json`（先算索引再提交）
2. `add`：`project.json`、`docs/**`、`assets/index.json`
3. `commit`：标准化 message（如 `docs: autosave snapshot`）

注意：`assets/` 二进制文件不 `add`。

---

## 6. 同步策略

- Git 仓库同步仅覆盖文本与元数据，不保证图片随仓库同步。
- 打开工程时执行资源完整性检查：
  - 若缺图，展示“占位 + 缺失提示”，不阻塞文本编辑。
- 提供“打包导出工程”能力：可选包含 `assets/`，用于完整分发。

---

## 7. 风险与对策

1. 文档引用断链
- 对策：强制 `assetId` 引用，不直接写物理路径。

2. 长期堆积无引用图片
- 对策：后台 GC（回收站 + 延迟删除），并提供“清理未引用资源”命令。

3. 自动提交过于频繁
- 对策：节流、批处理、最小变更检测（内容哈希）。

4. 多来源引用混淆
- 对策：所有时间戳、素材与笔记关联统一绑定 `sourceId`。

---

## 8. 分阶段落地

Phase A（最小可用）
- 工程目录初始化
- `project.json` + `docs/` + `assets/index.json`
- isomorphic-git 自动提交主链路

Phase B（稳定性）
- 引用校验与缺图提示
- 自动快照节流
- 基础回滚 UI

Phase C（工程化）
- 资源清理（GC）
- 打包导入导出
- 插件依赖解析与版本检查

---

## 9. 结论

该方案在“用户体验”和“工程可维护性”之间平衡较好：

- 对用户：无 Git 心智负担，历史可追溯。
- 对系统：文本可版本化、资源可控、架构可演进。
- 对未来：可平滑扩展到协作、同步与插件生态。