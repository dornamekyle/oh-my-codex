# Cursor 与 oh-my-codex（OMX）配合指南

> [← 文档首页](./index.html) · [Integrations](./integrations.html)

OMX 以 [OpenAI Codex CLI](https://github.com/openai/codex) 为第一执行面；若你主要使用 **Cursor**（编辑器 + Agent），仍可将 OMX 的**项目引导、`.omx/` 状态与 MCP 工具**接入工作流。本文说明能力与边界，避免与 Codex 专属功能混淆。

## 前置条件

- Node.js 20+
- 已安装 `oh-my-codex`（例如 `npm install -g oh-my-codex`）
- 建议先完成：`omx setup`（用户范围 `user` 时，会写入本机 MCP 配置，见下文）

## `omx setup` 对 Cursor 的影响

在用户范围（`user`，即默认写入 `~/.codex`）执行 `omx setup` 时，除既有的 Codex `config.toml`、Claude Code 的 `~/.claude/settings.json` 外，OMX 会将 `~/.omx/mcp-registry.json` 中列出的共享 MCP 服务**合并写入** `~/.cursor/mcp.json` 的顶层 `mcpServers` 字段（仅**添加**缺失的 server 名，不覆盖已有同名配置）。

若需跳过对 Cursor 的写入（例如你自行管理 `mcp.json`），可在运行 setup 前设置：

```bash
export OMX_CURSOR_MCP_SYNC_DISABLE=1
```

## 验证 MCP

- 官方说明：[Model Context Protocol (MCP) | Cursor Docs](https://cursor.com/docs/mcp)
- 在 Cursor 中打开 **Settings → MCP**（或 **Tools & MCP**，以当前版本界面为准），确认 `omx_state`、`omx_memory` 等条目与 registry 中名称一致；Codex `config.toml` 里由 OMX 管理的 `[mcp_servers.omx_*]` 表与 MCP 工具能力对应，但**名称以 `~/.omx/mcp-registry.json` 与合并后的 `mcp.json` 为准**。

## 能力对照（Codex CLI vs Cursor）

| 能力 | Codex + OMX | Cursor |
|------|-------------|--------|
| 根目录 `AGENTS.md`、项目约定 | 支持 | 可作为人类/Agent 上下文；可与 `.cursor/rules` 并用 |
| `.omx/` 计划、日志、状态 | 支持 | 文件仍在仓库/用户目录；Agent 可通过 MCP 或 `@` 文件访问 |
| OMX MCP（state / memory / trace / code_intel 等） | 通过 Codex 配置 | `omx setup` 可将同一 registry 合并进 `~/.cursor/mcp.json` 后由 Cursor 连接 |
| `hooks.json`、会话钩子 | Codex 专属 | Cursor 不使用该文件 |
| `$deep-interview` 等技能关键词与 `.codex/skills` | Codex CLI 路由 | **不会**自动等价；需在对话中自行引用 `skills/` 下文档或写入 Rules |
| Team / tmux 多窗格编排 | 面向 Codex/tmux 会话 | 不在 Cursor UI 内等价复现；详见仓库内 Team 文档 |

## 与 Cursor Rules 的配合

- `.cursor/rules/*.mdc` 适合放**稳定、可复用的项目指令**；仓库根 `AGENTS.md`（或由 `omx setup` 生成的模板）适合放 **OMX 工作流与委托约定**。
- 不必把全部 `skills/` 复制进 Rules；可将常用工作流摘要写入 Rules，需要细节时再 `@` 对应 `SKILL.md`。

## 相关链接

- [Integrations 总览](./integrations.html)
- [OpenClaw 集成（英文）](./openclaw-integration.md)
