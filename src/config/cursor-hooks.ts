import { join } from "path";

/**
 * Cursor CLI hooks configuration.
 * Cursor hooks use a different event model than Codex:
 *   - beforeShellExecution / afterShellExecution (replaces Pre/PostToolUse Bash)
 *   - beforeMCPExecution / afterMCPExecution
 *   - afterFileEdit
 *
 * Events NOT supported in Cursor CLI: stop, beforeSubmitPrompt
 * (SessionStart logic moved to .cursor/rules/ static injection)
 */

export interface CursorHookEntry {
  command: string;
  when?: string;
}

export interface ManagedCursorHooksConfig {
  hooks: {
    beforeShellExecution: CursorHookEntry[];
    afterShellExecution: CursorHookEntry[];
    beforeMCPExecution: CursorHookEntry[];
    afterMCPExecution: CursorHookEntry[];
    afterFileEdit: CursorHookEntry[];
  };
}

/** @deprecated Use ManagedCursorHooksConfig */
export type ManagedCodexHooksConfig = ManagedCursorHooksConfig;

export function buildManagedCursorHooksConfig(pkgRoot: string): ManagedCursorHooksConfig {
  const hookScript = join(pkgRoot, "dist", "scripts", "cursor-hook.js");
  const command = `node "${hookScript}"`;

  return {
    hooks: {
      beforeShellExecution: [
        { command },
      ],
      afterShellExecution: [
        { command },
      ],
      beforeMCPExecution: [
        { command },
      ],
      afterMCPExecution: [
        { command },
      ],
      afterFileEdit: [
        { command },
      ],
    },
  };
}

/** @deprecated Use buildManagedCursorHooksConfig */
export const buildManagedCodexHooksConfig = buildManagedCursorHooksConfig;
