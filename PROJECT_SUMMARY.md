# Project Summary: oh-my-codex (OMX)

> 由 scan-project skill 于 2026-04-08 自动生成

## Overview

**oh-my-codex（OMX）** 是面向 [OpenAI Codex CLI](https://github.com/openai/codex) 的多智能体编排与工作流层：不替代 Codex 作为执行引擎，而是通过 `omx` CLI、Codex 钩子、MCP 服务、团队/tmux 运行时与 `.omx/` 状态目录，提供技能（`$deep-interview`、`$ralplan`、`$team`、`$ralph` 等）、角色提示与项目级引导（`AGENTS.md`）。

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript（ES2022，NodeNext ESM） |
| Runtime | Node.js ≥ 20 |
| Native / 辅助 | Rust workspace（explore harness、mux、runtime、sparkshell 等 crate） |
| CLI | `omx` → `dist/cli/omx.js`，主逻辑自 `src/cli/index.ts` 编译 |
| Validation | Zod |
| MCP | `@modelcontextprotocol/sdk` |
| Config 解析 | `@iarna/toml` |
| Lint | Biome（`src/**/*.ts` 等） |
| 测试 | Node 内置 `node --test`、c8 覆盖率；Rust 侧 `cargo test` / `cargo clippy` |
| 数据库 | 无内置 DB；状态以文件形式落在 `.omx/` |

## Directory Structure

```
oh-my-codex/
├── src/                 # TypeScript 源码（编译到 dist/）
│   ├── cli/             # omx 主 CLI：setup、doctor、team、explore、sparkshell、hooks…
│   ├── team/            # 团队编排、tmux、worker、状态机、策略
│   ├── mcp/             # MCP：state / memory / trace / code-intel
│   ├── hooks/           # Codex 钩子、会话、可扩展事件与 code-simplifier
│   ├── hud/             # HUD / tmux 相关 UI 辅助
│   ├── pipeline/        # 工作流阶段（ralplan、team-exec、ralph-verify 等）
│   ├── notifications/   # 通知与生命周期
│   ├── openclaw/        # OpenClaw 集成
│   ├── ralph/ / ralplan/ / planning/ / modes/  # 模式与规划
│   ├── state/ / session-history/ / subagents/ / verification/ / visual/
│   ├── config/ / agents/ / catalog/ / compat/ / runtime/ / autoresearch/
│   ├── scripts/         # 构建、测试、notify-hook、生成文档等脚本
│   └── utils/
├── crates/              # Rust workspace 成员
├── agents/ / prompts/ / skills/ / templates/  # 随包分发的智能体与技能资产
├── docs/                # 用户文档与 guidance schema
└── dist/                # tsc 输出（构建产物，勿手改）
```

## Architecture

整体为 **「Codex 执行 + OMX 编排壳」**：`omx` 负责安装/配置、启动会话策略（如 `--madmax`）、注册钩子与 MCP；**Team 模式** 依赖 tmux（及 Windows 上 psmux 等路径）做多窗格 worker；**状态与计划** 写入 `.omx/state/`、`.omx/plans/` 等，由 MCP 工具与文件约定共同约束。引导层遵循 `docs/guidance-schema.md` 中的统一 schema（AGENTS、运行时 overlay、team worker 等）。

数据流概要：用户 → Codex CLI → OMX 钩子/overlay →（可选）MCP 读写状态 → Team 时经 tmux/编排器分发任务 → 结果回写任务文件与日志。

## Key Modules

### `src/cli/`

- **Purpose**：`omx` 入口与子命令（setup、explore、sparkshell、team、hooks、session 等），以及 Codex 启动参数解析、会话模型说明文件等。
- **Key files**：`index.ts`、`setup.ts`、`omx.ts`（薄入口转调 `dist/cli/index.js`）。
- **Public interface**：包入口 `src/index.ts` 仅导出少量 API（setup、doctor、version、mergeConfig、agents、HUD 等）。

### `src/team/`

- **Purpose**：多智能体团队运行时：编排器、tmux 会话、worker 引导、任务/邮箱/锁、模型契约与再平衡策略。
- **Key files**：`orchestrator.ts`、`runtime.ts`、`tmux-session.ts`、`worker-bootstrap.ts`、`state/` 子模块。
- **Public interface**：由 CLI 与测试引用；状态类型集中在 `team/state/`。

### `src/mcp/`

- **Purpose**：为 Codex 提供 state、memory、trace、code-intel 等 MCP 服务实现与启动引导。
- **Key files**：`*-server.ts`、`bootstrap.ts`、`state-paths.ts`。

### `src/hooks/`

- **Purpose**：与 Codex 会话集成：overlay、会话读写、可扩展 hook 事件分发；`code-simplifier` 子模块。
- **Key files**：`agents-overlay.ts`、`session.ts`、`extensibility/`。

### `src/pipeline/`

- **Purpose**：可组合的阶段工厂（如 ralplan、team-exec、ralph-verify），供工作流串接。
- **Key files**：`stages/*.ts`、`index.ts` 导出。

### `crates/*`（Rust）

- **Purpose**：高性能或独立二进制能力（如 `omx-explore-harness` 只读探索、`omx-sparkshell` 等），由 npm script 在完整构建链中调用。

## Data Models

- **团队任务**：任务文件路径与 `task_id` 约定见 `docs/guidance-schema.md`（例如 `.omx/state/team/<team>/tasks/task-<id>.json`）。
- **邮箱 / worker 状态**：`.omx/state/team/.../mailbox/` 等，与 team 子系统类型 `team/state/types.ts` 一致。
- **全局/会话配置**：TOML/JSON 与 Codex 配置协同；`config/generator.ts` 参与合并与修复。

## API Surface

- **CLI**：通过 npm 全局/本地安装暴露 `omx`；子命令以 `src/cli/index.ts` 路由为准。
- **MCP 工具**：由各 `*-server.ts` 注册，供已配置的 Codex MCP 客户端调用。
- **程序化 API**：`src/index.ts` 导出有限，大部分能力以 CLI + 钩子 + 文件约定使用。

## Dependencies

### Production

| 包 | 用途 |
|----|------|
| `@iarna/toml` | 解析/处理 TOML 配置 |
| `@modelcontextprotocol/sdk` | MCP 服务端实现 |
| `zod` | 运行时 schema 校验 |

### Development

| 包 | 用途 |
|----|------|
| `typescript` | 编译与类型检查 |
| `@biomejs/biome` | Lint |
| `@types/node` | Node 类型 |
| `c8` | 覆盖率 |

## Development

### Prerequisites

- Node.js ≥ 20
- npm；完整构建需 **Rust toolchain**（`cargo fmt`、`cargo clippy`、`cargo build`）
- 使用 Team/tmux 相关功能时需本机 `tmux`（文档中的 Windows 路径见 README）

### Setup

```bash
npm ci
npm run build
# 或按 README：全局安装后 omx setup
```

### Common Commands

| Command | Description |
|---------|-------------|
| `npm run build` | 清理 `dist/` 并 `tsc`，设置 `omx` 可执行位 |
| `npm run dev` | `tsc --watch` |
| `npm run lint` | Biome lint |
| `npx tsc --noEmit` | 类型检查 |
| `npm run check:no-unused` | 未使用符号检查（单独 tsconfig） |
| `npm test` | build + 跑 Node 测试 + catalog 文档检查 |
| `npm run test:explore` | Rust + explore 相关 Node 测试 |
| `cargo fmt --all --check` / `cargo clippy ...` | Rust 格式与静态分析 |

## Conventions

- **代码风格**：TypeScript `strict`；Biome 对 `src/**/*.ts` 等 lint（非 full recommended 规则集，见 `biome.json`）。
- **模块**：ESM，导入使用 `.js` 扩展名以配合 NodeNext。
- **命名**：以现有 `src/` 目录为准；团队状态与任务 ID 格式遵循文档中的全局契约。
- **Git / CI**：GitHub Actions 跑 rustfmt、clippy、lint、tsc、多矩阵测试等；提交信息从近期历史可见版本发布与 hotfix 合并等惯例。
- **测试**：`__tests__` 与 `*.test.ts` 并列；关键路径有覆盖率门槛脚本（如 `coverage:team-critical`）。
