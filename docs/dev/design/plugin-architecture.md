# Noa Studio — 插件架构设计（Plugin Runtime Architecture）
版本：v0.1-plugin-arch  
状态：Draft  
更新日期：2026-02-16

---

## 1. 设计目标
插件架构用于扩展 Noa Studio 的非核心能力，并保证主程序稳定、安全、可演进。

核心目标：
- 安全：插件不直接获得系统高权限，所有能力受控暴露
- 稳定：插件崩溃/超时不影响主进程与渲染层
- 可扩展：以 capability/action 模型扩展能力
- 可维护：manifest 驱动、版本化协议、统一日志与错误模型
- 业务对齐：优先服务截图/OCR 后的剪贴板复制与会话导出

非目标：
- 不定义插件市场与云分发
- 不定义插件商业化与签名基础设施（后续迭代）
- 不在 MVP 强制落地内置 Markdown 编辑器插件化

---

## 2. 总体架构

```text
Renderer (UI)
  -> Main Host API (IPC)
    -> Plugin Manager
      -> Plugin Runtime Process (Node child process / worker)
        -> Plugin SDK
          -> Plugin Implementation
```

组件职责：
- Renderer：触发能力调用，不直接操作插件文件与系统能力
- Main Host：插件发现、加载、权限检查、调用路由、资源限制
- Runtime：插件执行容器，隔离故障，统一协议通信
- SDK：向插件开发者提供稳定 API 与类型定义

---

## 3. Manifest 规范

## 3.1 字段定义
```json
{
  "id": "noa.example.plugin",
  "name": "Noa Example Plugin",
  "version": "0.1.0",
  "engineVersion": ">=0.1.0 <0.2.0",
  "apiVersion": "1",
  "entry": "dist/index.js",
  "capabilities": ["transform.text", "analyze.media"],
  "permissions": {
    "network": false,
    "fs": "none",
    "exec": false,
    "clipboard": false
  }
}
```

## 3.2 校验规则
- `id` 全局唯一，建议反向域名风格
- `version` 使用 semver
- `engineVersion` 与 `apiVersion` 必须通过 Host 兼容性检查
- `entry` 必须位于插件包内且可执行
- `capabilities` 至少声明一个能力

---

## 4. 生命周期模型

状态机：
- `discovered` -> `validated` -> `loaded` -> `activated` -> `stopped`
- 任意状态失败进入 `error`

生命周期钩子：
- `onLoad(context)`：加载时初始化资源
- `onActivate(context)`：首次调用前激活
- `onDeactivate()`：停用时释放资源

Host 责任：
- 启动时仅加载，不强制激活（延迟激活）
- 空闲或异常时可回收 runtime

---

## 5. 能力模型（Capability / Action）

调用模型：
- `capability`：能力命名空间（如 `transform.text`）
- `action`：能力下的具体动作（如 `summarize`）

推荐能力命名：
- `transform.text`：文本处理（总结、翻译、改写）
- `analyze.media`：媒体分析（OCR 后处理、片段分析）
- `integration.clipboard`：剪贴板模板渲染与格式化
- `export.session`：会话导出增强（后处理、结构扩展）

请求格式：
```ts
type PluginInvokeRequest = {
  pluginId: string;
  capability: string;
  action: string;
  payload: unknown;
  timeoutMs?: number;
  traceId?: string;
};
```

响应格式：
```ts
type PluginInvokeResponse<T = unknown> =
  | { ok: true; data: T; meta?: { durationMs: number } }
  | { ok: false; error: { code: string; message: string; retriable?: boolean } };
```

错误码建议：
- `PLUGIN_NOT_FOUND`
- `PLUGIN_CAPABILITY_DENIED`
- `PLUGIN_ACTION_NOT_FOUND`
- `PLUGIN_TIMEOUT`
- `PLUGIN_RUNTIME_CRASHED`
- `PLUGIN_INTERNAL_ERROR`

---

## 6. 权限与安全边界

权限策略：
- 默认拒绝（deny by default）
- 按插件最小授权（least privilege）
- Host 强制校验权限，不信任插件自声明

建议权限粒度：
- `network`: `false | true`（后续可细化域名白名单）
- `fs`: `none | read | read-write`
- `exec`: `false | true`（仅白名单命令）
- `clipboard`: `false | true`

安全控制：
- 插件运行隔离（进程级）
- 调用超时与取消
- 内存/CPU 资源上限（后续实现）
- 插件日志脱敏与分级

---

## 7. Runtime 通信协议

建议通道：
- `plugin.discover`
- `plugin.load`
- `plugin.activate`
- `plugin.invoke`
- `plugin.stop`
- `plugin.health`

主进程对渲染层暴露：
- `plugins.list()`
- `plugins.get(pluginId)`
- `plugins.invoke(request)`
- `plugins.enable(pluginId, enabled)`

与内建能力边界（建议）：
- 内建通道负责基础链路：`integration.copyText`、`integration.copyImage`、`export.session`
- 插件通过 `plugins.invoke` 扩展模板与导出后处理能力
- 插件不得绕过 Host 直接访问系统高权限接口

协议要求：
- 所有请求带 `traceId`
- 所有响应统一结构（ok/data/error）
- 记录调用耗时与失败原因

---

## 8. SDK 设计建议

SDK 最小 API：
```ts
export interface PluginContext {
  logger: {
    info(message: string, meta?: unknown): void;
    warn(message: string, meta?: unknown): void;
    error(message: string, meta?: unknown): void;
  };
  getConfig<T = unknown>(key: string): T | undefined;
}

export interface NoaRuntimePlugin {
  id: string;
  capabilities: string[];
  execute(input: {
    capability: string;
    action: string;
    payload: unknown;
    context: PluginContext;
  }): Promise<unknown>;
}
```

开发体验：
- 提供 `@noa/plugin-sdk` 包（类型、工具、错误码）
- 提供 `createPlugin` 工具函数减少样板代码
- 提供本地调试模式（hot reload 可选）

---

## 9. 兼容性与版本策略

版本维度：
- `engineVersion`：Noa Studio 运行时版本
- `apiVersion`：插件 API 协议版本

策略建议：
- Host 在加载前做版本协商
- 主版本不兼容时拒绝加载并给出迁移提示
- 记录插件兼容矩阵（文档化）

---

## 10. 观测与故障处理

可观测指标：
- 加载成功率
- 调用成功率
- 调用 P95/P99 耗时
- 超时率与崩溃率

故障策略：
- 插件连续失败阈值触发自动熔断
- 熔断期间仅允许手动恢复
- 关键错误上报到诊断面板

---

## 11. 分阶段落地计划

Phase A（MVP Runtime）
- Manifest 校验
- 插件发现/加载/调用
- 统一响应与超时控制

Phase B（安全增强）
- 权限细化与 Host 强校验
- 进程级隔离与崩溃恢复

Phase C（开发者体验）
- SDK 发布
- 插件模板与示例
- 调试工具与日志面板

Phase D（运维与生态）
- 兼容性矩阵
- 签名与来源校验（可选）
- 插件管理 UI（启用/禁用/诊断）

---

## 12. 验收标准
- 插件崩溃不导致主窗口崩溃
- 未授权权限调用被拒绝且可审计
- 超时插件可被终止并返回标准错误
- 新增一个 capability/action 不需要改动核心架构

---

## 13. 文档联动
- 主设计文档：`docs/dev/design/design.md`
- 需求文档：`docs/dev/requirements/prd.md`
- 开发路线图：`docs/dev/roadmap/development-roadmap.md`

命名约定：
- 剪贴板能力使用 `integration.*`
- 导出能力使用 `export.session`
