/**
 * Shared type definitions used across multiple modules.
 */

/**
 * OpenClaw agent tool definition interface.
 *
 * All tools in literature, tasks, and workspace modules share this shape.
 * Registered via api.registerTool() from the OpenClaw plugin SDK.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}
