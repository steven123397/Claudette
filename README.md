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
- `OPENAI_BASE_URL`
  - 可选，默认值为 `https://api.openai.com/v1`。
- `CLAUDETTE_MODEL`
  - 可选，默认使用项目内配置的默认模型。

示例：

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_BASE_URL="https://api.openai.com/v1"
export CLAUDETTE_MODEL="gpt-4.1-mini"
npm run dev
```

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
