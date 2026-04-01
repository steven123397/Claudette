# Claudette Agent Guide

## 适用范围

本文件适用于仓库根目录及其子目录。

## 工作区约定

- 执行实现计划或功能开发时，默认在项目内 `.worktrees/` 创建隔离 worktree，不直接在 `main` 分支主工作区改代码。
- 如果仓库内已有实现计划，优先按计划执行；当前 `Claudette v1` 以 `docs/superpowers/plans/2026-04-01-claudette-v1-implementation-plan.md` 为主。

## 实现约定

- 保持 `Claudette` 为教学型最小闭环，不提前引入 `bash`、MCP、多 Agent、远程桥接、全屏 TUI。
- 优先保持模块边界清晰：`repl` 负责交互，`agent/runtime` 负责编排，`commands` 负责 slash commands，`tools` 负责工具协议与实现。
- 文件搜索优先使用 `rg`。
- 不要使用破坏性 Git 命令，如 `git reset --hard`。

## 测试与验证

- 实现功能或修复行为时优先按 TDD 执行：先写失败测试，再补实现。
- 在宣称任务完成前，至少运行与当前任务对应的测试；如果涉及工程骨架或可编译代码，还要运行构建验证。
- 当前 Node 工程默认验证命令：
  - `npm test`
  - `npm run build`

## 文档与参考

- 产品/范围参考：`docs/superpowers/specs/2026-03-31-claudette-design.md`
- 架构参考：`docs/references/claude-code-cli-mirror-architecture.md`
