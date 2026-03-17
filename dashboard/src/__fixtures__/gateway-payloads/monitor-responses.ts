/**
 * Monitor RPC response fixtures for store and component tests.
 *
 * These payloads mirror the EXACT shapes returned by the Monitor module:
 *   - Monitor interface: extensions/research-claw-core/src/monitor/service.ts (Monitor interface, lines 32-51)
 *   - List RPC: extensions/research-claw-core/src/monitor/rpc.ts (rc.monitor.list, line 64)
 *   - Toggle RPC: extensions/research-claw-core/src/monitor/rpc.ts (rc.monitor.toggle, line 131)
 */

import type { Monitor } from '../../stores/monitor';

// ── rc.monitor.list response ──────────────────────────────────────────────
// Source: monitor/rpc.ts:64 → service.list() → { items: Monitor[], total: number }

export const RC_MONITOR_LIST_RESPONSE: { items: Monitor[]; total: number } = {
  items: [
    {
      id: 'arxiv-daily',
      name: 'arXiv Daily Digest',
      source_type: 'arxiv',
      target: '',
      filters: { keywords: ['protein folding'], authors: [], categories: ['cs.AI'] },
      schedule: '0 7 * * *',
      enabled: true,
      notify: true,
      agent_prompt: 'Scan arXiv for new papers...',
      gateway_job_id: 'gw-job-001',
      last_check_at: '2026-03-17T07:00:00.000Z',
      last_results: [
        { title: 'AlphaFold3 enables...', authors: ['Jumper'], year: 2026 },
        { title: 'Protein structure prediction...', authors: ['Hassabis'], year: 2026 },
      ],
      last_error: null,
      check_count: 14,
      finding_count: 42,
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-17T07:00:00.000Z',
    },
    {
      id: 'github-releases',
      name: 'GitHub Release Tracker',
      source_type: 'github',
      target: 'huggingface/transformers',
      filters: { events: ['release', 'tag'] },
      schedule: '0 9 * * *',
      enabled: false,
      notify: true,
      agent_prompt: 'Check the target GitHub repository...',
      gateway_job_id: null,
      last_check_at: null,
      last_results: null,
      last_error: null,
      check_count: 0,
      finding_count: 0,
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'rss-with-error',
      name: 'RSS Feed Monitor',
      source_type: 'rss',
      target: 'https://example.com/feed.xml',
      filters: { keywords: ['AI'] },
      schedule: '0 8 * * *',
      enabled: true,
      notify: true,
      agent_prompt: 'Fetch the RSS feed...',
      gateway_job_id: 'gw-job-003',
      last_check_at: '2026-03-17T08:00:00.000Z',
      last_results: null,
      last_error: 'HTTP 503: Service Unavailable',
      check_count: 5,
      finding_count: 12,
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-17T08:00:00.000Z',
    },
  ],
  total: 3,
};

// ── rc.monitor.toggle response ────────────────────────────────────────────
// Source: monitor/rpc.ts:131 → service.toggle() → Monitor

export const RC_MONITOR_TOGGLE_ENABLED: Monitor = {
  ...RC_MONITOR_LIST_RESPONSE.items[1], // github-releases
  enabled: true,
  updated_at: '2026-03-18T00:00:00.000Z',
};

export const RC_MONITOR_TOGGLE_DISABLED: Monitor = {
  ...RC_MONITOR_LIST_RESPONSE.items[0], // arxiv-daily
  enabled: false,
  gateway_job_id: null,
  updated_at: '2026-03-18T00:00:00.000Z',
};

// ── cron.add response ─────────────────────────────────────────────────────
// Source: OpenClaw gateway cron.ts → returns CronJob with id

export const CRON_ADD_RESPONSE = {
  id: 'gw-job-new-001',
  name: '[rc-monitor] GitHub Release Tracker',
  schedule: { kind: 'cron' as const, expr: '0 9 * * *' },
  enabled: true,
};
