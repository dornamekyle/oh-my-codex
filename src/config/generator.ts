/**
 * MCP config generator for oh-my-codex (Cursor engine)
 *
 * Generates and merges OMX MCP server entries into ~/.cursor/mcp.json
 * and OMX guidance rules into .cursor/rules/omx.mdc.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join } from "path";
import type { UnifiedMcpRegistryServer } from "./mcp-registry.js";
import { DEFAULT_FRONTIER_MODEL } from "./models.js";

interface MergeOptions {
  modelOverride?: string;
  sharedMcpServers?: UnifiedMcpRegistryServer[];
  sharedMcpRegistrySource?: string;
  verbose?: boolean;
  /** @deprecated Cursor does not have a TUI status line config. Ignored. */
  includeTui?: boolean;
}

const DEFAULT_SETUP_MODEL = DEFAULT_FRONTIER_MODEL;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// MCP JSON helpers
// ---------------------------------------------------------------------------

interface McpServerEntry {
  command: string;
  args: string[];
  enabled: boolean;
}

function buildOmxMcpServers(pkgRoot: string): Record<string, McpServerEntry> {
  const stateServerPath = join(pkgRoot, "dist", "mcp", "state-server.js");
  const memoryServerPath = join(pkgRoot, "dist", "mcp", "memory-server.js");
  const codeIntelServerPath = join(pkgRoot, "dist", "mcp", "code-intel-server.js");
  const traceServerPath = join(pkgRoot, "dist", "mcp", "trace-server.js");

  return {
    omx_state: {
      command: "node",
      args: [stateServerPath],
      enabled: true,
    },
    omx_memory: {
      command: "node",
      args: [memoryServerPath],
      enabled: true,
    },
    omx_code_intel: {
      command: "node",
      args: [codeIntelServerPath],
      enabled: true,
    },
    omx_trace: {
      command: "node",
      args: [traceServerPath],
      enabled: true,
    },
  };
}

// ---------------------------------------------------------------------------
// Public API — MCP config merge
// ---------------------------------------------------------------------------

/**
 * Build a merged mcp.json content string. Preserves existing user entries,
 * upserts OMX-owned servers, and optionally adds shared registry servers.
 */
export function buildMergedConfig(
  existingContent: string,
  pkgRoot: string,
  options: MergeOptions = {},
): string {
  let parsed: Record<string, unknown> = {};
  const trimmed = existingContent.trim();
  if (trimmed.length > 0) {
    try {
      const raw = JSON.parse(existingContent);
      if (isRecord(raw)) parsed = raw;
    } catch {
      // If unparseable, start fresh but log below
    }
  }

  const existingServers = isRecord(parsed.mcpServers)
    ? { ...(parsed.mcpServers as Record<string, unknown>) }
    : {};

  const omxServers = buildOmxMcpServers(pkgRoot);
  for (const [name, entry] of Object.entries(omxServers)) {
    existingServers[name] = entry;
  }

  const sharedServers = options.sharedMcpServers ?? [];
  for (const server of sharedServers) {
    if (Object.hasOwn(existingServers, server.name)) continue;
    existingServers[server.name] = {
      command: server.command,
      args: [...server.args],
      enabled: server.enabled,
    };
  }

  const result = {
    ...parsed,
    mcpServers: existingServers,
  };

  return JSON.stringify(result, null, 2) + "\n";
}

/**
 * Detect the model name from existing mcp.json.
 * Cursor doesn't store model in mcp.json, so this always returns undefined.
 * @deprecated Cursor does not store model in mcp.json.
 */
export function getRootModelName(_config: string): string | undefined {
  return undefined;
}

/**
 * Strip OMX-owned MCP server entries from mcp.json content.
 */
export function stripExistingOmxBlocks(content: string): {
  cleaned: string;
  removed: number;
} {
  let parsed: Record<string, unknown> = {};
  const trimmed = content.trim();
  if (trimmed.length === 0) return { cleaned: content, removed: 0 };

  try {
    const raw = JSON.parse(content);
    if (isRecord(raw)) parsed = raw;
    else return { cleaned: content, removed: 0 };
  } catch {
    return { cleaned: content, removed: 0 };
  }

  const servers = parsed.mcpServers;
  if (!isRecord(servers)) return { cleaned: content, removed: 0 };

  const omxPrefixes = ["omx_"];
  let removed = 0;
  const cleaned = { ...servers };

  for (const key of Object.keys(cleaned)) {
    if (omxPrefixes.some((prefix) => key.startsWith(prefix))) {
      delete cleaned[key];
      removed++;
    }
  }

  if (removed === 0) return { cleaned: content, removed: 0 };

  return {
    cleaned:
      JSON.stringify({ ...parsed, mcpServers: cleaned }, null, 2) + "\n",
    removed,
  };
}

/** @deprecated No-op for Cursor engine. TOML feature flags do not apply. */
export function stripOmxFeatureFlags(config: string): string {
  return config;
}

/** @deprecated No-op for Cursor engine. TOML top-level keys do not apply. */
export function stripOmxTopLevelKeys(config: string): string {
  return config;
}

/** @deprecated No-op for Cursor engine. TOML env settings do not apply. */
export function stripOmxEnvSettings(config: string): string {
  return config;
}

/** @deprecated No-op for Cursor engine. */
export function stripExistingSharedMcpRegistryBlock(config: string): {
  cleaned: string;
  removed: number;
} {
  return { cleaned: config, removed: 0 };
}

/**
 * Merge OMX config into mcp.json at the given path.
 */
export async function mergeConfig(
  configPath: string,
  pkgRoot: string,
  options: MergeOptions = {},
): Promise<void> {
  let existing = "";

  if (existsSync(configPath)) {
    existing = await readFile(configPath, "utf-8");
  }

  const finalConfig = buildMergedConfig(existing, pkgRoot, options);

  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(configPath, finalConfig);
  if (options.verbose) {
    console.log(`  Written to ${configPath}`);
  }
}

/**
 * Detect and repair config incompatibilities in mcp.json.
 * Returns `true` if a repair was performed.
 */
export async function repairConfigIfNeeded(
  configPath: string,
  pkgRoot: string,
  options: MergeOptions = {},
): Promise<boolean> {
  if (!existsSync(configPath)) return false;

  const content = await readFile(configPath, "utf-8");

  try {
    const parsed = JSON.parse(content);
    if (!isRecord(parsed)) return false;
  } catch {
    return false;
  }

  const repaired = buildMergedConfig(content, pkgRoot, options);
  if (repaired === content) return false;
  await writeFile(configPath, repaired);
  return true;
}

// ---------------------------------------------------------------------------
// Developer instructions rule file (.cursor/rules/omx.mdc)
// ---------------------------------------------------------------------------

const OMX_DEVELOPER_INSTRUCTIONS = `You have oh-my-codex installed. AGENTS.md is your orchestration brain and the main orchestration surface. Use skill/keyword routing like $name plus spawned role-specialized subagents for specialized work. Cursor agents are available and may be used for independent parallel subtasks within a single session or team pane. Skills are loaded from installed SKILL.md files under .cursor/skills, not from native agent TOMLs. Use workflow skills via $name when explicitly invoked or clearly routed by AGENTS.md. Treat installed prompts as narrower internal execution surfaces under AGENTS.md authority, even when user-facing docs prefer $name keywords.`;

/**
 * Write or update the OMX Cursor rule file at .cursor/rules/omx.mdc.
 */
export async function writeOmxCursorRule(
  projectRoot: string,
  _pkgRoot: string,
  _options: MergeOptions = {},
): Promise<void> {
  const rulesDir = join(projectRoot, ".cursor", "rules");
  if (!existsSync(rulesDir)) {
    await mkdir(rulesDir, { recursive: true });
  }

  const rulePath = join(rulesDir, "omx.mdc");
  const ruleContent = [
    "---",
    "description: oh-my-codex orchestration guidance",
    "globs: **/*",
    "alwaysApply: true",
    "---",
    "",
    OMX_DEVELOPER_INSTRUCTIONS,
    "",
  ].join("\n");

  await writeFile(rulePath, ruleContent);
}
