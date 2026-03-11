/**
 * Research-Claw Core Plugin — Entry Point
 *
 * Registers all tools, RPC methods, hooks, services, and HTTP routes
 * for the literature library, task system, and workspace tracking.
 *
 * Registration totals:
 *   - 24 agent tools (12 literature + 6 task + 6 workspace)
 *   - 45 WS RPC methods + 1 HTTP route = 46 interface methods
 *     (26 rc.lit.* + 10 rc.task.* + 3 rc.cron.* + 6 rc.ws.* = 45 WS; POST /rc/upload = 1 HTTP)
 *   - 6 hooks (before_prompt_build, session_start, session_end, agent_end, after_tool_call, gateway_start)
 *   - 1 service (research-claw-db lifecycle)
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import * as path from 'node:path';

import { createDatabaseManager, type DatabaseManager } from './src/db/connection.js';
import { runMigrations } from './src/db/migrations.js';
import { LiteratureService } from './src/literature/service.js';
import { createLiteratureTools } from './src/literature/tools.js';
import { registerLiteratureRpc } from './src/literature/rpc.js';
import { TaskService } from './src/tasks/service.js';
import { createTaskTools } from './src/tasks/tools.js';
import { registerTaskRpc } from './src/tasks/rpc.js';
import { WorkspaceService, type WorkspaceConfig } from './src/workspace/service.js';
import { createWorkspaceTools } from './src/workspace/tools.js';
import { registerWorkspaceRpc } from './src/workspace/rpc.js';

// ── Upload file extension whitelist ──────────────────────────────────────

const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.txt', '.md', '.tex', '.bib',
  '.csv', '.tsv', '.json', '.xml',
  '.png', '.jpg', '.jpeg', '.gif', '.svg',
  '.py', '.r', '.m', '.ipynb',
  '.zip', '.tar', '.gz',
]);

// ── Plugin config shape ────────────────────────────────────────────────

interface PluginConfig {
  dbPath?: string;
  autoTrackGit?: boolean;
  defaultCitationStyle?: string;
  heartbeatDeadlineWarningHours?: number;
  workspace?: {
    root?: string;
    commitDebounceMs?: number;
    maxGitFileSize?: number;
    maxUploadSize?: number;
    gitAuthorName?: string;
    gitAuthorEmail?: string;
  };
}

// ── Minimal plugin API types (locally defined, contract-compatible) ────

interface PluginLogger {
  debug?: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

interface PluginApi {
  id: string;
  name: string;
  pluginConfig?: Record<string, unknown>;
  logger: PluginLogger;
  resolvePath: (input: string) => string;
  registerTool: (tool: unknown) => void;
  registerGatewayMethod: (method: string, handler: unknown) => void;
  registerHttpRoute: (params: {
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<boolean | void> | boolean | void;
    auth: 'gateway' | 'plugin';
    match?: 'exact' | 'prefix';
  }) => void;
  registerService: (service: {
    id: string;
    start: (ctx: { stateDir: string; logger: PluginLogger }) => void | Promise<void>;
    stop?: (ctx: { stateDir: string; logger: PluginLogger }) => void | Promise<void>;
  }) => void;
  on: (hookName: string, handler: (...args: unknown[]) => unknown, opts?: { priority?: number }) => void;
}

interface PluginDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  register?: (api: PluginApi) => void | Promise<void>;
}

// ── Plugin definition ──────────────────────────────────────────────────

const plugin: PluginDefinition = {
  id: 'research-claw-core',
  name: 'Research-Claw Core',
  description: 'Literature library, task management, and workspace tracking for academic research',
  version: '0.1.0',

  async register(api) {
    const cfg = (api.pluginConfig ?? {}) as PluginConfig;
    const dbPath = api.resolvePath(cfg.dbPath ?? '.research-claw/library.db');
    const deadlineWarningHours = cfg.heartbeatDeadlineWarningHours ?? 48;

    api.logger.info(`Research-Claw Core initializing (db: ${dbPath})`);

    // ── 1. Initialize database ───────────────────────────────────────
    let dbManager: DatabaseManager | null = createDatabaseManager(dbPath);
    runMigrations(dbManager.db);

    // ── 2. Initialize services ───────────────────────────────────────
    const litService = new LiteratureService(dbManager.db);
    const taskService = new TaskService(dbManager.db);

    const wsConfig: WorkspaceConfig = {
      root: api.resolvePath(cfg.workspace?.root ?? 'workspace'),
      autoTrackGit: cfg.autoTrackGit ?? true,
      commitDebounceMs: cfg.workspace?.commitDebounceMs ?? 5000,
      maxGitFileSize: cfg.workspace?.maxGitFileSize ?? 10_485_760,
      maxUploadSize: cfg.workspace?.maxUploadSize ?? 104_857_600,
      gitAuthorName: cfg.workspace?.gitAuthorName ?? 'Research-Claw',
      gitAuthorEmail: cfg.workspace?.gitAuthorEmail ?? 'research-claw@wentor.ai',
    };
    const wsService = new WorkspaceService(wsConfig);
    await wsService.init();

    // ── 3. Register database lifecycle service ───────────────────────
    api.registerService({
      id: 'research-claw-db',
      start() {
        if (dbManager?.isOpen()) {
          const result = dbManager.db.pragma('integrity_check') as Array<{ integrity_check: string }>;
          if (result[0]?.integrity_check !== 'ok') {
            api.logger.warn('Database integrity check returned warnings');
          }
        }
      },
      stop() {
        wsService.destroy();
        if (dbManager?.isOpen()) {
          // Checkpoint WAL before closing to ensure all data is flushed to the main DB file
          dbManager.db.pragma('wal_checkpoint(TRUNCATE)');
          dbManager.close();
          dbManager = null;
          api.logger.info('Research-Claw database closed');
        }
      },
    });

    // ── 4. Register tools (24 total) ─────────────────────────────────
    for (const tool of createLiteratureTools(litService)) {
      api.registerTool(tool);
    }
    for (const tool of createTaskTools(taskService)) {
      api.registerTool(tool);
    }
    for (const tool of createWorkspaceTools(wsService)) {
      api.registerTool(tool);
    }

    // ── 5. Register RPC methods (46 total) ───────────────────────────
    const registerMethod = api.registerGatewayMethod.bind(api) as (
      method: string,
      handler: unknown,
    ) => void;
    registerLiteratureRpc(registerMethod, litService);   // 26 methods
    registerTaskRpc(registerMethod, taskService);         // 10 task + 3 cron = 13 methods
    registerWorkspaceRpc(registerMethod, wsService);      // 6 methods

    // ── 6. Register HTTP route: POST /rc/upload ──────────────────────
    api.registerHttpRoute({
      path: '/rc/upload',
      auth: 'gateway',
      match: 'exact',
      async handler(req, res) {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } }));
          return true;
        }

        try {
          const { file, destination } = await parseMultipartUpload(req, wsConfig.maxUploadSize);

          if (!file) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: { code: 'UPLOAD_NO_FILE', message: 'No file in upload' } }));
            return true;
          }

          // Sanitize destination: reject traversal attempts early (wsService.save also validates)
          const destDir = destination || 'sources';
          if (destDir.includes('..') || destDir.startsWith('/') || destDir.startsWith('\\')) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: { code: 'UPLOAD_INVALID_PATH', message: 'Invalid destination path' } }));
            return true;
          }

          // Sanitize filename: strip null bytes, slashes, and control characters
          const safeFilename = file.filename
            .replace(/\0/g, '')
            .replace(/[\\/]/g, '_')
            .replace(/[\x00-\x1f]/g, '');
          if (!safeFilename) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: { code: 'UPLOAD_INVALID_FILENAME', message: 'Invalid filename' } }));
            return true;
          }

          // Check file extension against whitelist
          const ext = path.extname(safeFilename).toLowerCase();
          if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ok: false,
              error: {
                code: 'UPLOAD_INVALID_TYPE',
                message: `File type "${ext}" is not allowed. Allowed types: ${[...ALLOWED_UPLOAD_EXTENSIONS].join(', ')}`,
              },
            }));
            return true;
          }

          const destPath = `${destDir}/${safeFilename}`;
          const result = await wsService.save(destPath, file.data, `Upload: ${safeFilename} to ${destDir}`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            file: {
              name: safeFilename,
              path: result.path,
              type: 'file',
              size: result.size,
              mime_type: file.mimeType,
              modified_at: new Date().toISOString(),
              git_status: result.committed ? 'committed' : 'untracked',
            },
          }));
          return true;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed';
          const isTooLarge = message.includes('too large') || message.includes('TOO_LARGE');
          res.writeHead(isTooLarge ? 413 : 500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: false,
            error: { code: isTooLarge ? 'UPLOAD_TOO_LARGE' : 'UPLOAD_WRITE_FAILED', message },
          }));
          return true;
        }
      },
    });

    // ── 7. Register hooks (6) ────────────────────────────────────────

    // Hook 1: Inject research context into agent prompt
    api.on('before_prompt_build', () => {
      try {
        const stats = litService.getStats();
        const overdue = taskService.overdue();
        const upcoming = taskService.upcoming(deadlineWarningHours);

        const lines: string[] = [];
        lines.push(`[Research-Claw] Library: ${stats.total} papers (${stats.by_status['unread'] ?? 0} unread)`);

        if (overdue.length > 0) {
          lines.push(`[Research-Claw] OVERDUE: ${overdue.length} task(s) past deadline`);
          for (const t of overdue.slice(0, 3)) {
            lines.push(`  - "${t.title}" (deadline: ${t.deadline})`);
          }
        }
        if (upcoming.length > 0) {
          lines.push(`[Research-Claw] Upcoming: ${upcoming.length} task(s) due within ${deadlineWarningHours}h`);
          for (const t of upcoming.slice(0, 3)) {
            lines.push(`  - "${t.title}" (deadline: ${t.deadline})`);
          }
        }

        return { prependContext: lines.join('\n') };
      } catch {
        return {};
      }
    });

    // Hook 2: Ensure DB is open and migrated on session start
    api.on('session_start', () => {
      if (dbManager?.isOpen()) {
        runMigrations(dbManager.db);
      }
    });

    // Hook 3: Close open reading sessions on session end
    api.on('session_end', () => {
      if (!dbManager?.isOpen()) return;
      try {
        const openSessions = dbManager.db
          .prepare('SELECT id FROM rc_reading_sessions WHERE ended_at IS NULL')
          .all() as Array<{ id: string }>;
        for (const session of openSessions) {
          try {
            litService.endReading(session.id);
          } catch (err) {
            api.logger.warn(`Failed to end reading session ${session.id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } catch (err) {
        api.logger.warn(`Error closing reading sessions: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    // Hook 4: Record agent run summary
    api.on('agent_end', () => {
      // Lightweight: future versions can log session summary to activity_log
    });

    // Hook 5: Capture results from research-plugins tools
    api.on('after_tool_call', (event: unknown) => {
      // Future: if tool is from research-plugins, offer to add papers
      void event;
    });

    // Hook 6: Verify DB integrity on gateway start
    api.on('gateway_start', () => {
      if (!dbManager?.isOpen()) return;
      try {
        const result = dbManager.db.pragma('integrity_check') as Array<{ integrity_check: string }>;
        if (result[0]?.integrity_check !== 'ok') {
          api.logger.warn('Database integrity check failed on gateway start');
        }
      } catch (err) {
        api.logger.error(`DB integrity check error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    api.logger.info('Research-Claw Core registered (24 tools, 45 WS RPC + 1 HTTP = 46 interfaces, 6 hooks)');
  },
};

export default plugin;

// ── Multipart upload parser ────────────────────────────────────────────

interface UploadedFile {
  filename: string;
  data: Buffer;
  mimeType: string;
}

async function parseMultipartUpload(
  req: IncomingMessage,
  maxSize: number,
): Promise<{ file: UploadedFile | null; destination: string }> {
  const contentType = req.headers['content-type'] ?? '';
  const boundaryMatch = contentType.match(/boundary=(.+?)(?:;|$)/);
  if (!boundaryMatch) {
    throw new Error('Missing multipart boundary');
  }

  // Unquote boundary if quoted per RFC 2046
  let boundary = boundaryMatch[1];
  if (boundary.startsWith('"') && boundary.endsWith('"')) {
    boundary = boundary.slice(1, -1);
  }
  const chunks: Buffer[] = [];
  let totalSize = 0;

  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > maxSize) {
        req.destroy();
        reject(new Error('UPLOAD_TOO_LARGE'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', resolve);
    req.on('error', reject);
  });

  const rawBody = Buffer.concat(chunks);
  const boundaryBuf = Buffer.from(`--${boundary}`);

  // Split raw body by boundary, preserving binary data
  const partBuffers: Buffer[] = [];
  let searchStart = 0;
  while (searchStart < rawBody.length) {
    const idx = rawBody.indexOf(boundaryBuf, searchStart);
    if (idx === -1) {
      partBuffers.push(rawBody.subarray(searchStart));
      break;
    }
    if (idx > searchStart) {
      partBuffers.push(rawBody.subarray(searchStart, idx));
    }
    searchStart = idx + boundaryBuf.length;
  }

  let file: UploadedFile | null = null;
  let destination = '';

  for (const partBuf of partBuffers) {
    // Find header/body separator (\r\n\r\n)
    const separator = Buffer.from('\r\n\r\n');
    const headerEnd = partBuf.indexOf(separator);
    if (headerEnd === -1) continue;

    // Parse headers as UTF-8 to correctly handle non-ASCII filenames
    const headers = partBuf.subarray(0, headerEnd).toString('utf-8');

    // Extract body as raw Buffer, strip trailing \r\n
    let bodyBuf = partBuf.subarray(headerEnd + 4);
    if (bodyBuf.length >= 2 && bodyBuf[bodyBuf.length - 2] === 0x0d && bodyBuf[bodyBuf.length - 1] === 0x0a) {
      bodyBuf = bodyBuf.subarray(0, bodyBuf.length - 2);
    }

    const trimmedHeaders = headers.trim();
    if (trimmedHeaders === '' || trimmedHeaders === '--') continue;

    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const ctMatch = headers.match(/Content-Type:\s*(.+?)(?:\r\n|$)/i);

    if (!nameMatch) continue;

    if (nameMatch[1] === 'file' && filenameMatch) {
      file = {
        filename: filenameMatch[1],
        data: bodyBuf,
        mimeType: ctMatch?.[1]?.trim() ?? 'application/octet-stream',
      };
    } else if (nameMatch[1] === 'destination') {
      destination = bodyBuf.toString('utf-8').trim();
    }
  }

  return { file, destination };
}
