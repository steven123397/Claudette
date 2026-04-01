# Claudette v1

`Claudette` 是一个用于学习和实践的迷你版 Claude Code，当前 `v1` 保持「教学型最小闭环」。

## 启动

安装依赖：

```bash
npm install
```

启动行式 REPL：

```bash
npm run dev
```

## 环境变量

启动前至少确认以下环境变量：

- `OPENAI_API_KEY`
  - OpenAI-compatible 服务的 API Key。
  - 也支持 `DASHSCOPE_API_KEY` 或 `QWEN_API_KEY` 作为 Qwen / DashScope 的别名。
- `OPENAI_BASE_URL`
  - 可选，默认值为 `https://api.openai.com/v1`。
  - 也支持 `DASHSCOPE_BASE_URL` 或 `QWEN_BASE_URL`。
  - 如果只配置了 `DASHSCOPE_API_KEY` / `QWEN_API_KEY`，会自动切到 `https://dashscope.aliyuncs.com/compatible-mode/v1`。
- `CLAUDETTE_MODEL`
  - 可选，默认使用项目内配置的默认模型。
  - 也支持 `DASHSCOPE_MODEL` 或 `QWEN_MODEL`。
  - 如果只配置了 Qwen / DashScope 的 API Key，默认模型会自动切到 `qwen3.5-plus`。

示例：

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_BASE_URL="https://api.openai.com/v1"
export CLAUDETTE_MODEL="gpt-4.1-mini"
npm run dev
```

如果要改用 Qwen / DashScope，可以直接这样启动：

```bash
export DASHSCOPE_API_KEY="sk-..."
npm run dev
```

如需手动指定模型或国际站地址：

```bash
export QWEN_API_KEY="sk-..."
export QWEN_BASE_URL="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
export QWEN_MODEL="qwen3-coder-plus"
npm run dev
```

常见问题：

- 如果报 `Incorrect API key provided`，先检查 API Key 末尾有没有误带句号、引号或空格。
- 如果使用的是国际站或其他地域创建的 Key，记得同步设置对应的 `QWEN_BASE_URL` / `DASHSCOPE_BASE_URL`。

## v1 命令清单

- `/help`
- `/clear`
- `/exit`
- `/session list`
- `/session resume <id>`
- `/model`
- `/model <name>`
- `/tools`
- `/decision add <summary> --because <rationale>`
- `/decision list`
- `/compass`

普通输入不会走本地命令系统，而是交给 provider + runtime 处理。

## Session 路径

所有会话数据都写在当前工作区的 `.claudette/` 目录下：

- session 索引：`.claudette/sessions/index.json`
- 单个 session transcript：`.claudette/sessions/<session-id>/transcript.jsonl`
- 决策账本：`.claudette/decision-ledger.jsonl`

## 开发验证

```bash
npm test
npm run build
```
