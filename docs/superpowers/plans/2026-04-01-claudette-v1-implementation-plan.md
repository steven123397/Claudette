# Claudette V1 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建一个可运行的 `Claudette v1`，覆盖行式 REPL、OpenAI-compatible provider、文件工具、slash commands、项目内会话持久化与恢复、以及 `decision / compass` 两个特色命令。

**架构：** 采用模块化单体 CLI。`repl` 只负责输入输出，`agent/runtime` 负责普通对话编排，`commands` 负责 slash commands，`tools` 负责工具协议与实现，`session` 与 `workspace` 分别承担持久化边界和文件系统边界。`v1` 明确不做 `bash`、MCP、远程桥接与多 Agent。

**技术栈：** TypeScript、Node.js、npm、`tsx`、Vitest、OpenAI-compatible Chat Completions + tool calls

---

## 输入文档

- 规格文档：`docs/superpowers/specs/2026-03-31-claudette-design.md`
- 架构研究：`docs/references/claude-code-cli-mirror-architecture.md`

## 参考约定

- **参考源码：** 指向 `claude-code-cli-mirror` 中可直接借鉴的源码路径。
- **参考说明：** 当 `Claudette` 需求是自定义能力，或镜像仓库过重不适合照搬时，说明本任务借鉴的是哪条原则而不是哪段实现。
- **执行原则：**
  - `agent/runtime` 是唯一可以同时协调 `provider + tools + session` 的模块。
  - 任何文件写操作都必须经过 `workspace/policy.ts`。
  - transcript 使用 JSONL。
  - 从任务 2 开始严格按 TDD 执行。

## 计划边界

本计划只覆盖 `v1`：

- 包含：REPL、`read / glob / grep / write / patch`、`/help /clear /exit /session /model /tools /decision /compass`、会话恢复、工作区边界。
- 不包含：`bash`、MCP、插件系统、远程桥接、多 Agent、全屏 TUI、全局配置中心。

## 文件结构

### 工程与配置

- `package.json`
  - 项目脚本、依赖、入口命令。
- `tsconfig.json`
  - TypeScript 编译配置。
- `vitest.config.ts`
  - 测试入口与路径别名。

### 应用装配

- `src/cli/entry.ts`
  - CLI 入口，解析参数并调用 bootstrap。
- `src/app/bootstrap.ts`
  - 启动流程，创建容器并进入 REPL。
- `src/app/container.ts`
  - 组装 provider、runtime、commands、tools、session、workspace。
- `src/config/env.ts`
  - 读取环境变量与默认值。
- `src/config/models.ts`
  - `v1` 模型清单与模型切换策略。

### REPL

- `src/repl/startRepl.ts`
  - 行式 REPL 主循环。
- `src/repl/prompt.ts`
  - prompt 文案与输入辅助。
- `src/repl/renderMessage.ts`
  - 渲染 assistant / tool / system 消息。
- `src/repl/inputQueue.ts`
  - 简化版输入队列，统一用户输入与系统提示。

### Commands

- `src/commands/types.ts`
  - 命令类型与 handler 签名。
- `src/commands/parser.ts`
  - slash command 解析。
- `src/commands/registry.ts`
  - 命令注册中心。
- `src/commands/handlers/help.ts`
- `src/commands/handlers/clear.ts`
- `src/commands/handlers/exit.ts`
- `src/commands/handlers/session.ts`
- `src/commands/handlers/model.ts`
- `src/commands/handlers/tools.ts`
  - `v1` 基础本地命令。

### Agent Runtime

- `src/agent/runtime.ts`
  - 普通对话的统一入口。
- `src/agent/turnLoop.ts`
  - 一轮对话中的模型调用循环。
- `src/agent/toolLoop.ts`
  - tool call 执行与回注循环。
- `src/agent/contextBuilder.ts`
  - 组装系统上下文、会话上下文与工具 schema。

### Provider

- `src/provider/types.ts`
  - provider 抽象。
- `src/provider/openaiCompatible/client.ts`
  - OpenAI-compatible 请求封装。
- `src/provider/openaiCompatible/messageMapper.ts`
  - 内部消息与 provider 消息之间的转换。

### Session

- `src/session/types.ts`
  - transcript 与 session 元数据类型。
- `src/session/store.ts`
  - transcript 追加写入。
- `src/session/index.ts`
  - session 列表索引。
- `src/session/resume.ts`
  - resume 加载与恢复。

### Workspace

- `src/workspace/paths.ts`
  - 路径归一化与项目根目录解析。
- `src/workspace/policy.ts`
  - 越界拦截、文件访问守卫。

### Tools

- `src/tools/types.ts`
  - 工具协议、schema、只读/并发元数据。
- `src/tools/registry.ts`
  - `v1` 工具注册中心。
- `src/tools/dispatcher.ts`
  - 工具查找、校验、执行。
- `src/tools/implementations/readTool.ts`
- `src/tools/implementations/globTool.ts`
- `src/tools/implementations/grepTool.ts`
- `src/tools/implementations/writeTool.ts`
- `src/tools/implementations/patchTool.ts`

### Features

- `src/features/decisionLedger/store.ts`
  - 决策账本数据存储。
- `src/features/decisionLedger/command.ts`
  - `/decision` 命令。
- `src/features/projectCompass/analyzer.ts`
  - 项目罗盘分析器。
- `src/features/projectCompass/command.ts`
  - `/compass` 命令。

### Utils

- `src/utils/jsonl.ts`
- `src/utils/fs.ts`
- `src/utils/errors.ts`
- `src/utils/format.ts`

### 测试

- `tests/app/bootstrap.test.ts`
- `tests/workspace/policy.test.ts`
- `tests/session/store.test.ts`
- `tests/session/resume.test.ts`
- `tests/tools/readTool.test.ts`
- `tests/tools/searchTools.test.ts`
- `tests/tools/writeTool.test.ts`
- `tests/tools/patchTool.test.ts`
- `tests/commands/parser.test.ts`
- `tests/commands/localCommands.test.ts`
- `tests/provider/openaiCompatible/messageMapper.test.ts`
- `tests/provider/openaiCompatible/client.test.ts`
- `tests/agent/runtime.test.ts`
- `tests/repl/replSmoke.test.ts`
- `tests/features/decisionLedger.test.ts`
- `tests/features/projectCompass.test.ts`

## 任务 1：建立工程骨架与依赖注入容器

**文件：**

- 创建：`package.json`
- 创建：`tsconfig.json`
- 创建：`vitest.config.ts`
- 创建：`src/cli/entry.ts`
- 创建：`src/app/bootstrap.ts`
- 创建：`src/app/container.ts`
- 创建：`src/config/env.ts`
- 测试：`tests/app/bootstrap.test.ts`

**参考：**

- 规格文档：`docs/superpowers/specs/2026-03-31-claudette-design.md` 第 4、5、6 节
- 参考源码：`entrypoints/cli.tsx`、`main.tsx`、`interactiveHelpers.tsx`
- 参考说明：镜像仓库使用 Bun + Ink；`Claudette` 这里只继承“启动分流 + 容器装配”的结构，不继承运行时与 UI 框架。

- [x] **步骤 1：初始化最小脚手架**

创建 `package.json`、`tsconfig.json`、`vitest.config.ts`，确保仓库可以执行 TypeScript 与 Vitest。

```json
{
  "scripts": {
    "dev": "tsx src/cli/entry.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "tsc -p tsconfig.json"
  }
}
```

- [x] **步骤 2：编写失败的容器测试**

```ts
import { createContainer } from '../../src/app/container'

it('creates a container bound to the current workspace', () => {
  const container = createContainer({ cwd: '/tmp/demo' })
  expect(container.workspace.root).toBe('/tmp/demo')
  expect(container.commands).toBeDefined()
  expect(container.tools).toBeDefined()
})
```

- [x] **步骤 3：运行测试验证失败**

运行：`npx vitest run tests/app/bootstrap.test.ts`
预期：FAIL，报错 `Cannot find module '../../src/app/container'` 或 `createContainer is not a function`

- [x] **步骤 4：实现最小容器与 bootstrap**

```ts
export type AppContainer = {
  config: AppConfig
  workspace: { root: string }
  session: SessionFacade
  tools: ToolRegistry
  commands: CommandRegistry
}
```

`bootstrap.ts` 只做三件事：解析环境、创建容器、进入 `startRepl(container)`。

- [x] **步骤 5：运行测试验证通过**

运行：`npx vitest run tests/app/bootstrap.test.ts`
预期：PASS

- [ ] **步骤 6：Commit**

```bash
git add package.json tsconfig.json vitest.config.ts src/cli/entry.ts src/app/bootstrap.ts src/app/container.ts src/config/env.ts tests/app/bootstrap.test.ts
git commit -m "chore: scaffold claudette v1 app container"
```

## 任务 2：实现工作区边界与会话持久化基础

**文件：**

- 创建：`src/workspace/paths.ts`
- 创建：`src/workspace/policy.ts`
- 创建：`src/session/types.ts`
- 创建：`src/session/store.ts`
- 创建：`src/session/index.ts`
- 创建：`src/session/resume.ts`
- 创建：`src/utils/jsonl.ts`
- 测试：`tests/workspace/policy.test.ts`
- 测试：`tests/session/store.test.ts`
- 测试：`tests/session/resume.test.ts`

**参考：**

- 规格文档：`docs/superpowers/specs/2026-03-31-claudette-design.md` 第 3.1、6、7 节
- 参考源码：`utils/sessionStorage.ts`、`utils/conversationRecovery.ts`、`utils/sessionRestore.ts`
- 参考源码：`history.ts`
- 参考说明：`v1` 不需要镜像仓库那种复杂恢复，但必须继承“transcript 是主数据”和“resume 要做日志修复”的理念。

- [x] **步骤 1：编写工作区边界失败测试**

```ts
import { assertPathInsideWorkspace } from '../../src/workspace/policy'

it('rejects paths outside workspace root', () => {
  expect(() =>
    assertPathInsideWorkspace('/repo', '/etc/passwd')
  ).toThrow(/outside workspace/i)
})
```

- [x] **步骤 2：编写会话存储失败测试**

```ts
import { appendTranscript, loadTranscript } from '../../src/session/store'

it('appends and reloads transcript lines in order', async () => {
  await appendTranscript(sessionDir, [{ role: 'user', content: 'hi' }])
  const transcript = await loadTranscript(sessionDir)
  expect(transcript.at(-1)?.content).toBe('hi')
})
```

- [x] **步骤 3：运行测试验证失败**

运行：`npx vitest run tests/workspace/policy.test.ts tests/session/store.test.ts tests/session/resume.test.ts`
预期：FAIL，报错缺少 `policy` / `store` / `resume` 模块

- [x] **步骤 4：实现路径归一化与越界拦截**

```ts
export function assertPathInsideWorkspace(root: string, target: string): string {
  const resolved = resolve(root, target)
  if (!resolved.startsWith(root)) throw new Error('Path is outside workspace')
  return resolved
}
```

- [x] **步骤 5：实现 transcript 与 session index**

实现要求：

- transcript 路径固定在项目内，例如 `.claudette/sessions/<id>/transcript.jsonl`
- index 记录 `id / title / model / createdAt / updatedAt`
- `resume.ts` 负责：
  - 加载 transcript
  - 丢弃未闭合或非法消息
  - 返回可继续编排的消息列表

- [x] **步骤 6：运行测试验证通过**

运行：`npx vitest run tests/workspace/policy.test.ts tests/session/store.test.ts tests/session/resume.test.ts`
预期：PASS

- [x] **步骤 7：Commit**

```bash
git add src/workspace src/session src/utils/jsonl.ts tests/workspace tests/session
git commit -m "feat: add workspace policy and session persistence"
```

## 任务 3：实现工具协议与只读工具

**文件：**

- 创建：`src/tools/types.ts`
- 创建：`src/tools/registry.ts`
- 创建：`src/tools/dispatcher.ts`
- 创建：`src/tools/implementations/readTool.ts`
- 创建：`src/tools/implementations/globTool.ts`
- 创建：`src/tools/implementations/grepTool.ts`
- 测试：`tests/tools/readTool.test.ts`
- 测试：`tests/tools/searchTools.test.ts`

**参考：**

- 参考源码：`Tool.ts`
- 参考源码：`tools.ts`
- 参考源码：`services/tools/toolOrchestration.ts`
- 参考源码：`tools/FileReadTool/FileReadTool.ts`
- 参考说明：`v1` 不需要镜像仓库那样完整的 UI render hooks，但必须保留 `schema / validate / isReadOnly / isConcurrencySafe`。

- [x] **步骤 1：编写失败的工具协议测试**

```ts
import { createToolRegistry } from '../../src/tools/registry'

it('registers read-only tools with metadata', () => {
  const registry = createToolRegistry()
  const read = registry.get('read')
  expect(read?.isReadOnly).toBe(true)
  expect(read?.isConcurrencySafe).toBe(true)
})
```

- [x] **步骤 2：编写失败的 `read` / `glob` / `grep` 测试**

```ts
it('reads a file within workspace', async () => {
  const result = await readTool.execute({ filePath: 'src/a.ts' }, ctx)
  expect(result.content).toContain('export')
})
```

- [x] **步骤 3：运行测试验证失败**

运行：`npx vitest run tests/tools/readTool.test.ts tests/tools/searchTools.test.ts`
预期：FAIL

- [x] **步骤 4：实现工具协议与注册中心**

```ts
export type ToolDefinition<TInput, TOutput> = {
  name: string
  description: string
  isReadOnly: boolean
  isConcurrencySafe: boolean
  validate(input: unknown): TInput
  execute(input: TInput, ctx: ToolContext): Promise<TOutput>
}
```

- [x] **步骤 5：实现 `read / glob / grep`**

实现要求：

- 所有路径先经过 `workspace/policy.ts`
- `read` 支持行范围读取
- `glob` 返回相对路径列表
- `grep` 返回文件路径、行号、匹配内容摘要

- [x] **步骤 6：运行测试验证通过**

运行：`npx vitest run tests/tools/readTool.test.ts tests/tools/searchTools.test.ts`
预期：PASS

- [ ] **步骤 7：Commit**

```bash
git add src/tools tests/tools
git commit -m "feat: add tool protocol and readonly file tools"
```

## 任务 4：实现写入类工具 `write / patch`

**文件：**

- 创建：`src/tools/implementations/writeTool.ts`
- 创建：`src/tools/implementations/patchTool.ts`
- 测试：`tests/tools/writeTool.test.ts`
- 测试：`tests/tools/patchTool.test.ts`

**参考：**

- 参考源码：`tools/FileEditTool/FileEditTool.ts`
- 参考源码：`tools/FileReadTool/FileReadTool.ts`
- 参考说明：`Claudette` 的 `patch` 采用更小的文本补丁模型，不实现镜像仓库中的超大工具协议与复杂 UI，但要继承写入前校验与安全边界。

- [x] **步骤 1：编写失败的 `write` 测试**

```ts
it('writes content inside workspace only', async () => {
  await writeTool.execute({ filePath: 'notes.txt', content: 'hello' }, ctx)
  expect(await fs.readFile(file)).toBe('hello')
})
```

- [x] **步骤 2：编写失败的 `patch` 测试**

```ts
it('replaces exact text once by default', async () => {
  const result = await patchTool.execute({
    filePath: 'a.ts',
    oldString: 'old',
    newString: 'new'
  }, ctx)
  expect(result.replacements).toBe(1)
})
```

- [x] **步骤 3：运行测试验证失败**

运行：`npx vitest run tests/tools/writeTool.test.ts tests/tools/patchTool.test.ts`
预期：FAIL

- [x] **步骤 4：实现 `writeTool`**

实现要求：

- 文件不存在时创建
- 默认覆盖整文件
- 路径必须在工作区内
- 将写入结果返回为结构化摘要，例如字节数、是否新建

- [x] **步骤 5：实现 `patchTool`**

实现要求：

- 以精确字符串替换为核心
- 默认只替换 1 次，支持 `replaceAll`
- 未找到 `oldString` 时返回明确错误
- 将变更摘要写回 transcript，便于 resume 后理解历史

- [x] **步骤 6：运行测试验证通过**

运行：`npx vitest run tests/tools/writeTool.test.ts tests/tools/patchTool.test.ts`
预期：PASS

- [ ] **步骤 7：Commit**

```bash
git add src/tools/implementations/writeTool.ts src/tools/implementations/patchTool.ts tests/tools/writeTool.test.ts tests/tools/patchTool.test.ts
git commit -m "feat: add write and patch tools"
```

## 任务 5：实现命令系统与基础本地命令

**文件：**

- 创建：`src/commands/types.ts`
- 创建：`src/commands/parser.ts`
- 创建：`src/commands/registry.ts`
- 创建：`src/commands/handlers/help.ts`
- 创建：`src/commands/handlers/clear.ts`
- 创建：`src/commands/handlers/exit.ts`
- 创建：`src/commands/handlers/session.ts`
- 创建：`src/commands/handlers/model.ts`
- 创建：`src/commands/handlers/tools.ts`
- 测试：`tests/commands/parser.test.ts`
- 测试：`tests/commands/localCommands.test.ts`

**参考：**

- 参考源码：`types/command.ts`
- 参考源码：`commands.ts`
- 参考说明：`v1` 只实现 `local` 和 `prompt` 两类命令；不实现 `local-jsx`。

- [x] **步骤 1：编写失败的 parser 测试**

```ts
import { parseCommand } from '../../src/commands/parser'

it('parses slash commands and args', () => {
  expect(parseCommand('/model gpt-4.1')).toEqual({
    name: 'model',
    args: 'gpt-4.1'
  })
})
```

- [x] **步骤 2：编写失败的本地命令测试**

```ts
it('returns help text for /help', async () => {
  const result = await registry.execute('/help', ctx)
  expect(result.type).toBe('system')
  expect(result.content).toContain('/session')
})
```

- [x] **步骤 3：运行测试验证失败**

运行：`npx vitest run tests/commands/parser.test.ts tests/commands/localCommands.test.ts`
预期：FAIL

- [x] **步骤 4：实现命令 parser 与 registry**

```ts
export type CommandDefinition = {
  name: string
  kind: 'local' | 'prompt'
  execute(args: string, ctx: CommandContext): Promise<CommandResult>
}
```

- [x] **步骤 5：实现 `/help /clear /exit /session /model /tools`**

实现要求：

- `/clear` 清空当前 REPL 展示状态，但不删除 transcript 文件
- `/session` 至少支持 `list / resume <id>`
- `/model` 支持查看当前模型与切换默认模型
- `/tools` 输出当前已启用工具及其简述

- [x] **步骤 6：运行测试验证通过**

运行：`npx vitest run tests/commands/parser.test.ts tests/commands/localCommands.test.ts`
预期：PASS

- [ ] **步骤 7：Commit**

```bash
git add src/commands tests/commands
git commit -m "feat: add slash command system"
```

## 任务 6：实现 provider 抽象与 OpenAI-compatible 适配层

**文件：**

- 创建：`src/provider/types.ts`
- 创建：`src/provider/openaiCompatible/client.ts`
- 创建：`src/provider/openaiCompatible/messageMapper.ts`
- 修改：`src/config/models.ts`
- 测试：`tests/provider/openaiCompatible/messageMapper.test.ts`
- 测试：`tests/provider/openaiCompatible/client.test.ts`

**参考：**

- 规格文档：`docs/superpowers/specs/2026-03-31-claudette-design.md` 第 4、7 节
- 参考源码：`QueryEngine.ts`
- 参考源码：`query.ts`
- 参考源码：`context.ts`
- 参考说明：镜像仓库面向 Anthropic API；`Claudette` 只借鉴“内部消息模型与 provider 适配隔离”的思路，协议细节按 OpenAI-compatible 实现。

- [x] **步骤 1：编写失败的 message mapper 测试**

```ts
it('maps internal tool definitions to OpenAI tool schema', () => {
  const tools = mapToolsToProviderSchemas(registry.list())
  expect(tools[0]).toHaveProperty('function.name')
})
```

- [x] **步骤 2：编写失败的 client 测试**

```ts
it('returns assistant text when provider responds without tool calls', async () => {
  const result = await provider.complete(turnInput)
  expect(result.type).toBe('final')
})
```

- [x] **步骤 3：运行测试验证失败**

运行：`npx vitest run tests/provider/openaiCompatible/messageMapper.test.ts tests/provider/openaiCompatible/client.test.ts`
预期：FAIL

- [x] **步骤 4：实现 provider 抽象**

```ts
export type ChatProvider = {
  complete(input: ProviderTurnInput): Promise<ProviderTurnResult>
}
```

- [x] **步骤 5：实现 OpenAI-compatible client 与 message mapper**

实现要求：

- 内部消息模型统一使用 `system / user / assistant / tool`
- provider 适配层负责把工具 schema 转成 OpenAI-compatible function calling 格式
- API key、base URL、model 从 `config/env.ts` 与 `config/models.ts` 注入

- [x] **步骤 6：运行测试验证通过**

运行：`npx vitest run tests/provider/openaiCompatible/messageMapper.test.ts tests/provider/openaiCompatible/client.test.ts`
预期：PASS

- [ ] **步骤 7：Commit**

```bash
git add src/provider src/config/models.ts tests/provider
git commit -m "feat: add openai compatible provider layer"
```

## 任务 7：实现 `agent/runtime`、单轮主循环与工具循环

**文件：**

- 创建：`src/agent/runtime.ts`
- 创建：`src/agent/turnLoop.ts`
- 创建：`src/agent/toolLoop.ts`
- 创建：`src/agent/contextBuilder.ts`
- 测试：`tests/agent/runtime.test.ts`

**参考：**

- 参考源码：`QueryEngine.ts`
- 参考源码：`query.ts`
- 参考源码：`query/config.ts`
- 参考源码：`query/tokenBudget.ts`
- 参考说明：`Claudette v1` 不实现 compact、stop hooks、复杂 budget continuation，但要保留“会话级 runtime + 单轮 loop + 工具循环”这条主结构。

- [x] **步骤 1：编写失败的 runtime 测试**

```ts
it('runs tool loop until the provider returns final text', async () => {
  const result = await runtime.respond('Summarize this repo')
  expect(result.finalMessage.role).toBe('assistant')
  expect(result.toolCalls.length).toBeGreaterThanOrEqual(0)
})
```

- [x] **步骤 2：运行测试验证失败**

运行：`npx vitest run tests/agent/runtime.test.ts`
预期：FAIL

- [x] **步骤 3：实现会话级 `runtime`**

实现要求：

- 接收用户输入
- 从 session 加载历史
- 调用 `contextBuilder`
- 把回合执行委托给 `turnLoop`
- 将结果写回 transcript 与 session index

- [x] **步骤 4：实现 `turnLoop` 与 `toolLoop`**

实现要求：

- 单回合最大工具循环次数可配置，例如默认 `8`
- provider 返回文本时直接结束
- provider 返回 tool calls 时：
  - 通过 registry 找工具
  - 校验输入
  - 执行工具
  - 将 tool result 追加到消息列表
  - 再次调用 provider

- [x] **步骤 5：加入最小保护**

实现要求：

- tool loop 超过上限时抛错
- 未知工具直接终止当前回合并返回系统错误
- 工具错误也要以结构化消息写入 transcript

- [x] **步骤 6：运行测试验证通过**

运行：`npx vitest run tests/agent/runtime.test.ts`
预期：PASS

- [ ] **步骤 7：Commit**

```bash
git add src/agent tests/agent
git commit -m "feat: add agent runtime and tool loop"
```

## 任务 8：实现行式 REPL 与输入分发

**文件：**

- 创建：`src/repl/startRepl.ts`
- 创建：`src/repl/prompt.ts`
- 创建：`src/repl/renderMessage.ts`
- 创建：`src/repl/inputQueue.ts`
- 修改：`src/app/bootstrap.ts`
- 测试：`tests/repl/replSmoke.test.ts`

**参考：**

- 规格文档：`docs/superpowers/specs/2026-03-31-claudette-design.md` 第 3.1、7 节
- 参考源码：`replLauncher.tsx`
- 参考源码：`utils/messageQueueManager.ts`
- 参考说明：镜像仓库的 Ink/React 不进入 `v1`；这里只继承“REPL 是壳，命令/普通对话分发走统一入口”的模式。

- [x] **步骤 1：编写失败的 REPL 分发测试**

```ts
it('routes slash commands without invoking the provider', async () => {
  const output = await handleInput('/help', replCtx)
  expect(output.kind).toBe('system')
  expect(provider.complete).not.toHaveBeenCalled()
})
```

- [x] **步骤 2：运行测试验证失败**

运行：`npx vitest run tests/repl/replSmoke.test.ts`
预期：FAIL

- [x] **步骤 3：实现 `inputQueue` 与 `handleInput`**

实现要求：

- 输入以 `/` 开头时走命令系统
- 否则走 `runtime.respond()`
- 系统提示与错误消息也可以进入同一队列渲染

- [x] **步骤 4：实现最小 REPL**

实现要求：

- 提供循环读取输入
- 支持优雅退出
- 将 assistant、tool、system 消息按统一文本样式输出

- [x] **步骤 5：运行测试验证通过**

运行：`npx vitest run tests/repl/replSmoke.test.ts`
预期：PASS

- [ ] **步骤 6：Commit**

```bash
git add src/repl src/app/bootstrap.ts tests/repl
git commit -m "feat: add line repl shell"
```

## 任务 9：实现 `/decision` 决策账本

**文件：**

- 创建：`src/features/decisionLedger/store.ts`
- 创建：`src/features/decisionLedger/command.ts`
- 修改：`src/commands/registry.ts`
- 测试：`tests/features/decisionLedger.test.ts`

**参考：**

- 规格文档：`docs/superpowers/specs/2026-03-31-claudette-design.md` 第 3.1、6 节
- 参考说明：镜像仓库没有同名功能，本任务不找直接源码；借鉴的是“特色能力放进 `features/`，通过命令与 session 协作，但保持独立数据模型”的设计原则。

- [x] **步骤 1：编写失败的决策账本测试**

```ts
it('appends decisions and lists them in chronological order', async () => {
  await decisionStore.append({ summary: 'Use Vitest', rationale: 'Lightweight' })
  const items = await decisionStore.list()
  expect(items[0]?.summary).toBe('Use Vitest')
})
```

- [x] **步骤 2：运行测试验证失败**

运行：`npx vitest run tests/features/decisionLedger.test.ts`
预期：FAIL

- [x] **步骤 3：实现 `decisionLedger/store.ts`**

实现要求：

- 存储位置在项目内，例如 `.claudette/decision-ledger.jsonl`
- 每条记录包含 `summary / rationale / timestamp / sessionId`

- [x] **步骤 4：实现 `/decision`**

实现要求：

- `/decision add <summary> --because <rationale>`
- `/decision list`
- 输出应适合学习型项目阅读，不做复杂筛选

- [x] **步骤 5：运行测试验证通过**

运行：`npx vitest run tests/features/decisionLedger.test.ts`
预期：PASS

- [ ] **步骤 6：Commit**

```bash
git add src/features/decisionLedger src/commands/registry.ts tests/features/decisionLedger.test.ts
git commit -m "feat: add decision ledger command"
```

## 任务 10：实现 `/compass` 项目罗盘

**文件：**

- 创建：`src/features/projectCompass/analyzer.ts`
- 创建：`src/features/projectCompass/command.ts`
- 修改：`src/commands/registry.ts`
- 测试：`tests/features/projectCompass.test.ts`

**参考：**

- 规格文档：`docs/superpowers/specs/2026-03-31-claudette-design.md` 第 3.1、6 节
- 参考说明：镜像仓库没有直接的 `compass` 实现；这里借鉴的是其 `context.ts + read/glob/grep` 组合思路，用项目内文件扫描生成“当前项目概览”。

- [x] **步骤 1：编写失败的罗盘分析测试**

```ts
it('summarizes package, entry files and test files', async () => {
  const result = await analyzeProjectCompass(workspaceRoot)
  expect(result.sections).toContainEqual(expect.objectContaining({ title: '入口与模块' }))
})
```

- [x] **步骤 2：运行测试验证失败**

运行：`npx vitest run tests/features/projectCompass.test.ts`
预期：FAIL

- [x] **步骤 3：实现分析器**

实现要求：

- 从工作区扫描 `package.json`、`src/`、`tests/`、`docs/`
- 输出固定结构：
  - 项目定位
  - 入口与模块
  - 工具与测试
  - 当前缺口

- [x] **步骤 4：实现 `/compass` 命令**

实现要求：

- 输出文本化项目概览
- 不直接走模型调用
- 如果项目为空仓库，也要给出可读降级结果

- [x] **步骤 5：运行测试验证通过**

运行：`npx vitest run tests/features/projectCompass.test.ts`
预期：PASS

- [ ] **步骤 6：Commit**

```bash
git add src/features/projectCompass src/commands/registry.ts tests/features/projectCompass.test.ts
git commit -m "feat: add project compass command"
```

## 任务 11：完成 `v1` 联调、构建与文档收口

**文件：**

- 修改：`src/cli/entry.ts`
- 修改：`src/app/bootstrap.ts`
- 修改：`src/repl/startRepl.ts`
- 可选创建：`README.md`
- 测试：`tests/repl/replSmoke.test.ts`

**参考：**

- 规格文档：`docs/superpowers/specs/2026-03-31-claudette-design.md` 全文
- 参考源码：`entrypoints/cli.tsx`
- 参考源码：`QueryEngine.ts`
- 参考说明：这里关注的是整链路是否闭环，不再继续引入镜像仓库的复杂子系统。

- [x] **步骤 1：补一条端到端 smoke 测试**

```ts
it('supports one local command turn and one normal chat turn', async () => {
  // 1. /tools
  // 2. 普通输入触发 mocked provider
})
```

- [x] **步骤 2：运行 smoke 测试验证失败**

运行：`npx vitest run tests/repl/replSmoke.test.ts`
预期：FAIL，暴露真实联调缺口

- [x] **步骤 3：修通整条链路**

检查项：

- `entry.ts -> bootstrap -> startRepl`
- slash command 不经过 provider
- 普通对话经过 `runtime`
- tool result 可写回 transcript
- `/session list` 能看到当前 session

- [x] **步骤 4：运行完整测试**

运行：`npm run test`
预期：PASS，全部测试通过

- [x] **步骤 5：运行构建**

运行：`npm run build`
预期：PASS，`tsc` 无报错

- [x] **步骤 6：补最小使用说明**

在 `README.md` 或 `docs/` 中补充：

- 启动命令
- 必需环境变量
- `v1` 命令清单
- session 路径说明

- [ ] **步骤 7：Commit**

```bash
git add src README.md tests
git commit -m "feat: complete claudette v1 vertical slice"
```

## 最终验收清单

- [x] CLI 可以启动并进入行式 REPL。
- [x] `/help /clear /exit /session /model /tools /decision /compass` 可用。
- [x] 普通对话可经 OpenAI-compatible provider 返回文本。
- [x] provider 返回 tool calls 时，可正确执行 `read / glob / grep / write / patch`。
- [x] 所有文件访问都受工作区根目录保护。
- [x] transcript 与 session index 可落盘。
- [x] 可以 `list / resume` 已有 session。
- [x] `npm run test` 通过。
- [x] `npm run build` 通过。

## 执行建议

推荐执行顺序就是任务编号顺序，不要并行起步。原因是：

1. 任务 1 到任务 4 会定义 `v1` 的基础边界。
2. 任务 5 到任务 8 才能形成真正的闭环交互。
3. 任务 9 到任务 10 是特色能力，必须建立在闭环之上。
4. 任务 11 才负责整体验收与收口。

本计划已显式绑定两类参考：

- **设计参考：** `docs/superpowers/specs/2026-03-31-claudette-design.md`
- **架构参考：** `docs/references/claude-code-cli-mirror-architecture.md`

如果某一步需要继续下钻，优先回看计划中给出的镜像源码路径，而不是重新在整个镜像仓库里无目的搜索。
