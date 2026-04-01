# Claudette 总体设计

> 日期：2026-03-31
> 状态：已完成首轮共识，待进入实现计划

## 1. 项目目标

`Claudette` 是一个用于学习和实践的迷你版 Claude Code。它不是对参考仓库的功能复刻，而是基于参考实现抽取出一个足够清晰、足够小、又足够真实的 Agent CLI 内核。

本项目的核心目标是：

- 帮助使用者理解一个终端 Agent CLI 的最小闭环。
- 用尽量小的实现，覆盖真正有价值的核心链路。
- 保持架构边界清晰，使其可以从 `v1` 平滑演进到更强的终端 UI 和工具能力。

## 2. 产品定位

`Claudette` 的定位是「教学型最小闭环」，但不是一次性 Demo。它从一开始就明确包含：

- 命令系统
- 会话存储
- 可调用的文件工具
- 可切换的模型配置
- 小而美的特色能力

这意味着它应当具备长期演进的基础结构，但不追求在 `v1` 覆盖多 Agent、MCP、远程桥接、全局多项目索引、快照搜索等复杂特性。

在产品气质上，`Claudette` 还会偏向「学生 / 独立开发者友好」：不仅帮助写代码，也帮助理解项目、沉淀决策和准备交付。

## 3. 范围边界

### 3.1 `v1` 范围

`v1` 明确包含：

- 行式 REPL 终端交互。
- OpenAI-compatible 模型接入。
- 读写型工具集：
  - `read`
  - `glob`
  - `grep`
  - `write`
  - `patch`
- 学习型命令集：
  - `/help`
  - `/clear`
  - `/exit`
  - `/session`
  - `/model`
  - `/tools`
- 首批特色命令：
  - `/decision`
  - `/compass`
- 项目内会话持久化与恢复：
  - transcript
  - 元数据索引
  - `list / resume`
- 单工作区根目录边界控制。
- 决策账本基础版。
- 项目罗盘基础版。

### 3.2 `v1` 不包含

以下内容明确不进入 `v1`：

- `bash` 工具
- 多 Agent / Team / Swarm 模式
- MCP 支持
- 轻量 TUI / Ink 全屏 UI
- 全局配置中心
- 交付助手
- 多项目会话索引
- 快照、搜索、回放
- AST 级编辑
- Notebook 特殊编辑能力

## 4. 技术栈与参考关系

### 4.1 选型

`Claudette` 采用：

- 语言：TypeScript
- 运行时：Node.js
- 交互形态：行式 REPL
- 模型协议：OpenAI-compatible Chat Completions + tool calls

### 4.2 选型理由

选择 TypeScript + Node.js 的原因：

- 与参考仓库的客户端实现足够接近，便于持续对照学习。
- 不强绑定 Bun，降低环境门槛。
- 适合把命令系统、工具系统、会话存储、Provider 抽象做成清晰模块。

### 4.3 参考仓库的使用方式

参考仓库用于吸收以下设计经验：

- 命令系统与工具系统分离
- runtime 负责编排，renderer 负责展示
- provider 适配层隔离协议细节
- 会话与工作区边界独立建模

`Claudette` 不照搬参考仓库的大量复杂子系统，也不平铺参考仓库的目录风格。

## 5. 总体架构方案

最终采用的架构方案为：`模块化单体 CLI`。

### 5.1 为什么选择模块化单体

- 对教学型项目最友好。
- 能覆盖真实产品的关键链路。
- 可以在一个进程内快速迭代。
- 后续从行式 REPL 升级到轻量 TUI / Ink 时，不需要推翻核心模块。

### 5.2 为什么不选择更重的架构

- `核心内核 + 服务适配层`：对 `v1` 来说抽象过重，容易为了未来而过度设计。
- `事件流 / 状态机驱动`：虽利于回放与可视化，但会显著抬高实现和理解成本。

## 6. 模块划分与职责边界

`Claudette` 的模块划分如下：

- `app/bootstrap`
  - 负责启动、读取配置、组装依赖、创建上下文。
  - 不承载业务逻辑。

- `repl`
  - 负责终端输入输出。
  - `v1` 为行式 REPL。
  - 后续若升级到轻量 TUI 或 Ink，全量替换主要发生在这一层。

- `commands`
  - 解析和执行 slash commands。
  - 不直接处理模型协议细节。
  - 通过 runtime 或 session-store 暴露的接口完成操作。

- `agent`
  - 作为核心编排层。
  - 组织用户输入、模型调用、工具循环、会话落盘。

- `provider`
  - 封装 OpenAI-compatible 协议。
  - 负责消息转换、工具调用适配、流式回复处理。

- `tools`
  - 提供工具注册与工具实现。
  - 工具只关心输入、输出与执行，不关心命令系统和 UI。

- `session`
  - 负责 transcript 持久化、索引、恢复。
  - 是持久化边界，不参与 agent 决策。

- `workspace`
  - 负责单工作区根目录约束。
  - 提供路径解析、越界拦截和统一文件访问入口。

- `features`
  - 放置 `decision`、`compass`、`deliver` 等具有产品辨识度的特色能力。
  - 与 `commands` 协作，但保持独立的数据模型和存储结构。

## 7. 一次完整交互的数据流

### 7.1 Slash command 路径

当输入以 `/` 开头时：

1. `repl` 接收原始输入。
2. `commands/parser` 将其解析为结构化命令。
3. `commands/handlers` 执行对应逻辑。
4. 结果以结构化形式返回给 `repl` 渲染。

该路径不经过模型调用，目标是：

- 低延迟
- 可预测
- 易调试

### 7.2 普通对话路径

当输入不是命令时：

1. `repl` 将用户消息传给 `agent/runtime`。
2. `runtime` 组装：
   - 当前用户输入
   - 历史 transcript
   - 当前模型配置
   - 当前可用工具 schema
3. `runtime` 调用 `provider`。
4. 如果模型直接返回文本，则：
   - 写入 `session-store`
   - 返回 `repl` 渲染
5. 如果模型请求工具调用，则：
   - 通过 `tools/registry` 找到工具
   - 经 `workspace-policy` 做路径与边界校验
   - 执行工具
   - 将工具结果再次提交给 `provider`
   - 循环直到得到最终回复

### 7.3 编排原则

只有 `agent/runtime` 允许同时协调：

- provider
- tools
- session-store

其他模块不跨边界直接互调。

## 8. 目录结构

建议的目录结构如下：

```text
Claudette/
├── src/
│   ├── app/
│   │   ├── bootstrap.ts
│   │   └── container.ts
│   ├── repl/
│   │   ├── startRepl.ts
│   │   ├── renderMessage.ts
│   │   └── prompt.ts
│   ├── commands/
│   │   ├── parser.ts
│   │   ├── registry.ts
│   │   └── handlers/
│   ├── agent/
│   │   ├── runtime.ts
│   │   ├── turnLoop.ts
│   │   └── toolLoop.ts
│   ├── provider/
│   │   ├── types.ts
│   │   └── openaiCompatible/
│   ├── tools/
│   │   ├── registry.ts
│   │   ├── types.ts
│   │   └── implementations/
│   ├── session/
│   │   ├── store.ts
│   │   ├── index.ts
│   │   └── resume.ts
│   ├── workspace/
│   │   ├── policy.ts
│   │   └── paths.ts
│   ├── features/
│   │   ├── decisionLedger/
│   │   ├── projectCompass/
│   │   └── deliveryAssistant/
│   ├── config/
│   ├── types/
│   └── utils/
├── tests/
├── docs/
└── package.json
```

## 9. 子系统详细设计

### 9.1 命令系统

每个命令使用显式定义对象注册，包含：

- `name`
- `description`
- `args`
- `execute()`

`commands/parser` 只负责从字符串得到结构化命令，不承载真正业务逻辑。

命令执行结果统一返回结构化对象，例如：

- `text`
- `table`
- `error`

这样可以保证命令逻辑不绑定具体渲染方式，为后续 UI 升级保留空间。

### 9.2 会话存储

`v1` 使用**项目内持久化**，所有数据都保存在工作区下的 `.claudette/`。

建议结构：

```text
.claudette/
├── index.json
└── sessions/
    └── <sessionId>.jsonl
```

设计理由：

- 最直观，便于学习和调试
- 不引入全局索引复杂度
- 和单工作区根目录模型天然一致

`/session list` 仅列出当前项目会话。  
`/session resume` 仅恢复当前项目会话。

### 9.3 工具系统

每个工具都实现统一接口：

- `name`
- `description`
- `inputSchema`
- `execute(context, input)`

`v1` 工具集：

- `read`
- `glob`
- `grep`
- `write`
- `patch`

工具设计要求：

- 所有文件访问都经 `workspace-policy`
- 不允许工具自行拼接绝对路径越界访问
- `write` 使用整文件覆盖
- `patch` 使用受限文本补丁

`v1` 明确不做：

- AST 编辑
- Notebook 编辑
- Shell 命令执行

### 9.4 特色功能

#### 决策账本（进入 `v1`）

作用：把已经确认过的设计约束、实现原则、项目约定从聊天记录中抽离出来，变成项目内的显式资产。

建议命令：

- `/decision add`
- `/decision list`
- `/decision remove`

持久化建议：

```text
.claudette/decisions.json
```

运行期行为：

- agent 在进入修改任务前读取决策账本。
- 若当前方案明显违背已有决策，优先提醒而不是直接执行。

#### 项目罗盘（进入 `v1`）

作用：为当前项目维护一份可复用的结构地图、关键文件列表与术语摘要。

建议命令：

- `/compass build`
- `/compass show`
- `/compass refresh`

持久化建议：

```text
.claudette/compass.json
```

运行期行为：

- 新会话可以自动注入罗盘摘要。
- 减少重复理解代码库的成本。

#### 交付助手（后续里程碑）

作用：面向学生 / 作业 / 毕设场景，把项目整理成“可提交状态”。

建议命令族：

- `/deliver check`
- `/deliver prepare`
- `/deliver pack`

设计原则：

- 不把 commit、README、注释、规范检查拆成 5 个孤立功能。
- 而是统一成一个交付辅助模块。
- `v1` 不实现该模块，只在总体设计中保留边界和扩展位。

## 10. 配置与 Provider 设计

### 10.1 配置来源

`v1` 优先采用环境变量：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `CLAUDETTE_MODEL`

为了兼容基于 OpenAI-compatible 协议的其他服务，运行时也可接受 provider 别名环境变量，例如：

- `DASHSCOPE_API_KEY` / `QWEN_API_KEY`
- `DASHSCOPE_BASE_URL` / `QWEN_BASE_URL`
- `DASHSCOPE_MODEL` / `QWEN_MODEL`

可选允许项目内 `.claudette/config.json` 做覆盖。

### 10.2 Provider 设计

`v1` 基于 OpenAI-compatible Chat Completions + tool calls。

这样设计的理由：

- 兼容面更广
- 实现复杂度更低
- 更适合教学展示工具调用主链路

后续如果需要：

- 可增加第二种 provider
- 可升级到更复杂的 response / event 协议

## 11. 错误处理

`v1` 只区分 3 类错误：

- `user error`
  - 命令输入错误
  - 路径越界
  - 文件不存在

- `provider error`
  - API Key 错误
  - 429 限流
  - 网络超时
  - 模型不支持工具调用

- `internal error`
  - 代码缺陷
  - 状态不一致

设计原则：

- `runtime`、`provider`、`tools` 保留结构化错误
- `repl` 负责面向用户的错误展示
- 错误信息需要可读，但不隐藏类型边界

## 12. 演进路线

### 12.1 `v1`

- 行式 REPL
- OpenAI-compatible provider
- 读写型工具
- 学习型命令集
- 项目内会话存储
- 单工作区根目录策略
- 决策账本基础版
- 项目罗盘基础版

### 12.2 `v2`

- 轻量 TUI
- `bash` 工具
- `add-dir`
- 交付助手基础版：
  - `/deliver check`
  - `/deliver prepare`

### 12.3 `v3`

- Ink 全屏 UI
- 全局配置
- 多项目会话索引
- 快照 / 搜索
- 交付助手增强版：
  - `/deliver pack`
  - 学生项目模板细分

## 13. 非目标

以下不是当前设计文档要解决的问题：

- 如何做到和 Claude Code 的行为完全一致
- 如何复制参考仓库中的全部命令与内部功能
- 如何支持 Anthropic 内部能力或专有协议
- 如何一次性做成生产级完整产品

## 14. 总结

`Claudette` 的设计重点不是“做小号 Claude Code”，而是做一个边界清晰、链路完整、可持续演进的迷你 Agent CLI。

它的核心策略是：

- 用最小闭环验证真实价值
- 用清晰分层避免未来推倒重来
- 用克制范围确保学习成本和实现成本都可控

这份文档确认后，下一步应进入实现计划阶段，将 `v1` 拆成可测试、可逐步提交的任务。
