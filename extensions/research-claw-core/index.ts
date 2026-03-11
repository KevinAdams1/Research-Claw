/**
 * Research-Claw Core Plugin — Entry Point
 *
 * Registers all tools, RPC methods, hooks, services, and HTTP routes
 * for the literature library, task system, and workspace tracking.
 *
 * TODO: Full implementation per docs/modules/03f-research-claw-core-plugin.md
 */
import type { OpenClawPluginDefinition } from 'openclaw/plugin-sdk';

const plugin: OpenClawPluginDefinition = {
  id: 'research-claw-core',
  name: 'Research-Claw Core',
  description: 'Literature library, task management, and workspace tracking for academic research',
  version: '0.1.0',

  async register(api) {
    const cfg = api.pluginConfig as {
      dbPath?: string;
      autoTrackGit?: boolean;
      defaultCitationStyle?: string;
      heartbeatDeadlineWarningHours?: number;
    };

    const dbPath = api.resolvePath(cfg?.dbPath ?? '.research-claw/library.db');

    api.logger.info(`Research-Claw Core initializing (db: ${dbPath})`);

    // --- Services ---
    // TODO: Register research-claw-db service (start/stop lifecycle)

    // --- Literature Tools ---
    // TODO: Register library_add_paper, library_search, library_update_paper, etc.
    // See docs/modules/03a-literature-library.md

    // --- Task Tools ---
    // TODO: Register task_create, task_list, task_complete, etc.
    // See docs/modules/03b-task-system.md

    // --- Workspace Tools ---
    // TODO: Register workspace_save, workspace_read, workspace_list, etc.
    // See docs/modules/03c-workspace-git-tracking.md

    // --- Gateway RPC Methods ---
    // TODO: Register rc.lit.*, rc.task.*, rc.ws.* methods
    // See docs/modules/03f-research-claw-core-plugin.md

    // --- HTTP Routes ---
    // TODO: Register POST /rc/upload for file upload
    // See docs/modules/03c-workspace-git-tracking.md

    // --- Hooks ---

    // Inject research context into agent prompt
    api.on('before_prompt_build', async (_event, _ctx) => {
      // TODO: Return { prependContext: "..." } with library size, overdue tasks, deadlines
      return {};
    });

    // Open DB and run migrations on session start
    api.on('session_start', async (_event, _ctx) => {
      // TODO: Ensure DB is open and migrated
    });

    // Close reading sessions on session end
    api.on('session_end', async (_event, _ctx) => {
      // TODO: Close any open reading sessions, flush DB
    });

    // Record run summary
    api.on('agent_end', async (_event, _ctx) => {
      // TODO: Log run summary to activity log
    });

    // Capture research tool results
    api.on('after_tool_call', async (event, _ctx) => {
      // TODO: If tool is from research-plugins, offer to add papers to library
      void event;
    });

    // Verify DB integrity on gateway start
    api.on('gateway_start', async (_event, _ctx) => {
      // TODO: Run PRAGMA integrity_check
    });

    api.logger.info('Research-Claw Core registered');
  },
};

export default plugin;
