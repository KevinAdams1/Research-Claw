# 03b — Task System Module

> Research-Claw local task management: deadline-sorted list, human + agent tasks,
> activity logging, cron-driven reminders and research automation.

| Field        | Value                                     |
|-------------|-------------------------------------------|
| Status      | Draft                                     |
| Version     | 1.0                                       |
| Depends on  | `02` (engineering architecture), `03a` (literature library) |
| Depended by | `03d` (task_card type), `03f` (plugin aggregation), `04` (HEARTBEAT.md) |
| Defines     | `rc_tasks`, `rc_activity_log` tables; 6 agent tools; 10 `rc.task.*` RPC; 3 `rc.cron.presets.*` RPC |

---

## 1. Feature Overview

### 1.1 Design Philosophy

The task system is a **deadline-sorted list** — NOT a Kanban board. Research work revolves
around deadlines (conference submissions, grant applications, experiment schedules). A single
sorted list with folding for completed items keeps the interface focused and scannable.

### 1.2 Core Principles

| Principle                    | Rationale                                                    |
|------------------------------|--------------------------------------------------------------|
| **Deadline-first sorting**   | Most urgent item always visible at top                       |
| **Human + agent in one list**| Perspective toggle filters by `task_type`                    |
| **Completed items fold**     | Done/cancelled collapse into "Completed (N)" at bottom       |
| **Subtask nesting**          | `parent_task_id` allows one level of nesting                 |
| **Paper linkage**            | Tasks reference papers from `rc_papers` for context          |
| **Activity trail**           | Every mutation logged in `rc_activity_log`                   |

### 1.3 Display Order

1. **Overdue** (past deadline, not done/cancelled) — deadline ASC (most overdue first)
2. **Has deadline** — deadline ASC (soonest first)
3. **No deadline** — priority DESC (urgent > high > medium > low), then `created_at` ASC
4. **Completed** (collapsed) — `completed_at` DESC

Ties broken by priority, then `created_at`.

### 1.4 Perspective Switching

| Perspective  | Filter                             | Description                   |
|-------------|-------------------------------------|-------------------------------|
| **All**     | None                                | Every task                    |
| **My Tasks**| `task_type = 'human'`               | Researcher-owned tasks        |
| **Agent**   | `task_type IN ('agent','mixed')`    | Agent-involved tasks          |

Persisted in local storage.

---

## 2. SQLite Schema

### 2.1 Table: `rc_tasks`

```sql
CREATE TABLE IF NOT EXISTS rc_tasks (
    id              TEXT PRIMARY KEY,                        -- UUID v4
    title           TEXT NOT NULL,                           -- Max ~200 chars
    description     TEXT,                                    -- Markdown, nullable
    task_type       TEXT NOT NULL CHECK(task_type IN ('human','agent','mixed')),
    status          TEXT NOT NULL DEFAULT 'todo'
                         CHECK(status IN ('todo','in_progress','blocked','done','cancelled')),
    priority        TEXT NOT NULL DEFAULT 'medium'
                         CHECK(priority IN ('urgent','high','medium','low')),
    deadline        TEXT,                                    -- ISO 8601, nullable
    completed_at    TEXT,                                    -- ISO 8601, set on done
    created_at      TEXT NOT NULL,                           -- ISO 8601
    updated_at      TEXT NOT NULL,                           -- ISO 8601
    parent_task_id  TEXT REFERENCES rc_tasks(id) ON DELETE SET NULL,
    related_paper_id TEXT REFERENCES rc_papers(id) ON DELETE SET NULL,
    agent_session_id TEXT,                                   -- OpenClaw session ID
    tags            TEXT,                                    -- JSON array: '["writing","icml"]'
    notes           TEXT                                     -- Markdown notes
);
```

### 2.2 Table: `rc_activity_log`

```sql
CREATE TABLE IF NOT EXISTS rc_activity_log (
    id         TEXT PRIMARY KEY,                             -- UUID v4
    task_id    TEXT NOT NULL REFERENCES rc_tasks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,                                -- See allowed values below
    old_value  TEXT,                                         -- Previous value
    new_value  TEXT,                                         -- New value
    actor      TEXT NOT NULL CHECK(actor IN ('human','agent')),
    created_at TEXT NOT NULL                                 -- ISO 8601
);
```

**Allowed `event_type` values** (enforced at application level):
`created`, `status_changed`, `completed`, `note_added`, `deadline_changed`,
`priority_changed`, `title_changed`, `description_changed`, `tags_changed`,
`paper_linked`, `paper_unlinked`, `parent_changed`, `cancelled`

### 2.3 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_tasks_status ON rc_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON rc_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON rc_tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON rc_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON rc_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_related_paper_id ON rc_tasks(related_paper_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_task_id ON rc_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON rc_activity_log(created_at);

-- Composite: active tasks sorted by deadline (main list query)
CREATE INDEX IF NOT EXISTS idx_tasks_active_deadline
    ON rc_tasks(status, deadline)
    WHERE status NOT IN ('done', 'cancelled');
```

---

## 3. TypeScript Types

```typescript
// src/types/task.ts

export type TaskType     = 'human' | 'agent' | 'mixed';
export type TaskStatus   = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type Actor        = 'human' | 'agent';
export type TaskSortField = 'deadline' | 'priority' | 'created_at';

export type ActivityEventType =
  | 'created' | 'status_changed' | 'completed' | 'note_added'
  | 'deadline_changed' | 'priority_changed' | 'title_changed'
  | 'description_changed' | 'tags_changed' | 'paper_linked'
  | 'paper_unlinked' | 'parent_changed' | 'cancelled';

export interface Task {
  id: string; title: string; description: string | null;
  task_type: TaskType; status: TaskStatus; priority: TaskPriority;
  deadline: string | null; completed_at: string | null;
  created_at: string; updated_at: string;
  parent_task_id: string | null; related_paper_id: string | null;
  agent_session_id: string | null;
  tags: string[]; notes: string | null;
}

export interface ActivityLogEntry {
  id: string; task_id: string; event_type: ActivityEventType;
  old_value: string | null; new_value: string | null;
  actor: Actor; created_at: string;
}

export interface TaskInput {
  title: string; description?: string; task_type: TaskType;
  priority?: TaskPriority; deadline?: string;
  parent_task_id?: string; related_paper_id?: string;
  tags?: string[]; notes?: string;
}

export interface TaskPatch {
  title?: string; description?: string | null; task_type?: TaskType;
  status?: TaskStatus; priority?: TaskPriority; deadline?: string | null;
  parent_task_id?: string | null; related_paper_id?: string | null;
  agent_session_id?: string | null; tags?: string[]; notes?: string | null;
}

export interface TaskListParams {
  offset?: number; limit?: number;
  status?: TaskStatus; priority?: TaskPriority; task_type?: TaskType;
  sort?: TaskSortField; direction?: 'asc' | 'desc';
  include_completed?: boolean;
}

export interface TaskListResponse { items: Task[]; total: number; }

export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  urgent: 0, high: 1, medium: 2, low: 3,
};
```

---

## 4. Agent Tools

Six tools registered via `openclaw.plugin.json`. All follow the OpenClaw tool contract.

### 4.1 `task_create`

```typescript
import { Type, type Static } from '@sinclair/typebox';

export const TaskCreateParams = Type.Object({
  title:       Type.String({ description: 'Short task title', maxLength: 200 }),
  description: Type.Optional(Type.String({ description: 'Markdown description' })),
  task_type:   Type.Union([Type.Literal('human'), Type.Literal('agent'), Type.Literal('mixed')]),
  priority:    Type.Optional(Type.Union([
    Type.Literal('urgent'), Type.Literal('high'),
    Type.Literal('medium'), Type.Literal('low'),
  ], { default: 'medium' })),
  deadline:         Type.Optional(Type.String({ format: 'date-time' })),
  parent_task_id:   Type.Optional(Type.String({ format: 'uuid' })),
  related_paper_id: Type.Optional(Type.String({ format: 'uuid' })),
  tags:             Type.Optional(Type.Array(Type.String(), { maxItems: 20 })),
  notes:            Type.Optional(Type.String()),
});

export const TOOL_TASK_CREATE = {
  name: 'task_create',
  description: 'Create a new task in the Research-Claw task list.',
  parameters: TaskCreateParams,
};
```

**Behavior:** Generates UUID, sets `status='todo'`, timestamps. Logs `'created'` event. Returns `Task`.

### 4.2 `task_list`

```typescript
export const TaskListParams = Type.Object({
  status:   Type.Optional(Type.Union([
    Type.Literal('todo'), Type.Literal('in_progress'),
    Type.Literal('blocked'), Type.Literal('done'), Type.Literal('cancelled'),
  ])),
  priority: Type.Optional(Type.Union([
    Type.Literal('urgent'), Type.Literal('high'),
    Type.Literal('medium'), Type.Literal('low'),
  ])),
  task_type: Type.Optional(Type.Union([
    Type.Literal('human'), Type.Literal('agent'), Type.Literal('mixed'),
  ])),
  sort_by:           Type.Optional(Type.Union([
    Type.Literal('deadline'), Type.Literal('priority'), Type.Literal('created_at'),
  ], { default: 'deadline' })),
  include_completed: Type.Optional(Type.Boolean({ default: false })),
});

export const TOOL_TASK_LIST = {
  name: 'task_list',
  description: 'List tasks sorted by deadline. Filter by status, priority, or type.',
  parameters: TaskListParams,
};
```

**Behavior:** Builds SELECT with optional WHERE. Default excludes done/cancelled. NULLs sort last for deadline. Returns `{ items, total }`.

### 4.3 `task_complete`

```typescript
export const TaskCompleteParams = Type.Object({
  id:    Type.String({ format: 'uuid' }),
  notes: Type.Optional(Type.String({ description: 'Completion notes (appended)' })),
});

export const TOOL_TASK_COMPLETE = {
  name: 'task_complete',
  description: 'Mark a task as done. Sets completion timestamp.',
  parameters: TaskCompleteParams,
};
```

**Behavior:** Validates transition (Section 7). Sets `status='done'`, `completed_at=now()`. Appends notes if provided. Logs `'completed'`. Does NOT cascade to subtasks.

### 4.4 `task_update`

```typescript
export const TaskUpdateParams = Type.Object({
  id:          Type.String({ format: 'uuid' }),
  title:       Type.Optional(Type.String({ maxLength: 200 })),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  task_type:   Type.Optional(Type.Union([
    Type.Literal('human'), Type.Literal('agent'), Type.Literal('mixed'),
  ])),
  status:      Type.Optional(Type.Union([
    Type.Literal('todo'), Type.Literal('in_progress'),
    Type.Literal('blocked'), Type.Literal('done'), Type.Literal('cancelled'),
  ])),
  priority:    Type.Optional(Type.Union([
    Type.Literal('urgent'), Type.Literal('high'),
    Type.Literal('medium'), Type.Literal('low'),
  ])),
  deadline:         Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
  parent_task_id:   Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  related_paper_id: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  tags:             Type.Optional(Type.Array(Type.String(), { maxItems: 20 })),
  notes:            Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const TOOL_TASK_UPDATE = {
  name: 'task_update',
  description: 'Update fields on a task. Status changes validated against state machine.',
  parameters: TaskUpdateParams,
};
```

**Behavior:** Diffs each field. Status transitions validated (Section 7). If `status -> done`, sets `completed_at`. Logs one event per changed field.

### 4.5 `task_link`

```typescript
export const TaskLinkParams = Type.Object({
  task_id:  Type.String({ format: 'uuid' }),
  paper_id: Type.String({ format: 'uuid', description: 'Paper ID from rc_papers' }),
});

export const TOOL_TASK_LINK = {
  name: 'task_link',
  description: 'Link a task to a paper from the literature library.',
  parameters: TaskLinkParams,
};
```

**Behavior:** Validates both IDs exist. Sets `related_paper_id`. Logs `'paper_linked'` (and `'paper_unlinked'` if replacing).

### 4.6 `task_note`

```typescript
export const TaskNoteParams = Type.Object({
  task_id: Type.String({ format: 'uuid' }),
  note:    Type.String({ description: 'Markdown note to append', minLength: 1 }),
});

export const TOOL_TASK_NOTE = {
  name: 'task_note',
  description: 'Append a timestamped note to a task.',
  parameters: TaskNoteParams,
};
```

**Behavior:** Appends with separator `\n\n---\n[{timestamp} | {actor}]\n{note}`. Logs `'note_added'`.

### 4.7 Tool Summary

| Tool             | Required Params | Returns          | Activity Events             |
|------------------|----------------|------------------|-----------------------------|
| `task_create`    | title, task_type | `Task`          | `created`                   |
| `task_list`      | (none)         | `{ items, total }` | (none)                   |
| `task_complete`  | id             | `Task`           | `completed`                 |
| `task_update`    | id             | `Task`           | One per changed field       |
| `task_link`      | task_id, paper_id | `Task`        | `paper_linked`              |
| `task_note`      | task_id, note  | `Task`           | `note_added`                |

---

## 5. Plugin RPC Methods

Ten methods under `rc.task.*`, called via gateway WebSocket (protocol in `02`).

### 5.1 `rc.task.list`

**Params:** `{ offset?, limit?, status?, priority?, task_type?, sort?, direction?, include_completed? }`
**Returns:** `{ items: Task[], total: number }`

Sort behavior: `deadline` = NULLs last, secondary by priority. `priority` = by weight, secondary by deadline. `created_at` = chronological.

### 5.2 `rc.task.get`

**Params:** `{ id }`
**Returns:** `Task & { activity_log: ActivityLogEntry[], subtasks: Task[] }`

Activity log sorted by `created_at` DESC. Subtasks are immediate children only.

### 5.3 `rc.task.create`

**Params:** `{ task: TaskInput }`
**Returns:** `Task`

Validates `parent_task_id` and `related_paper_id` if provided. Actor = `'human'`.

### 5.4 `rc.task.update`

**Params:** `{ id, patch: TaskPatch }`
**Returns:** `Task`

Same field-level diff and transition validation as `task_update` tool.

### 5.5 `rc.task.complete`

**Params:** `{ id, notes? }`
**Returns:** `Task`

### 5.6 `rc.task.delete`

**Params:** `{ id }`
**Returns:** `{ ok: true }`

Hard delete. CASCADE removes activity log. Subtasks get `parent_task_id = NULL`.

### 5.7 `rc.task.upcoming`

**Params:** `{ hours?: number }` (default: 48)
**Returns:** `Task[]`

```sql
SELECT * FROM rc_tasks
WHERE status NOT IN ('done','cancelled')
  AND deadline IS NOT NULL
  AND deadline <= datetime('now', '+' || :hours || ' hours')
  AND deadline >= datetime('now')
ORDER BY deadline ASC;
```

### 5.8 `rc.task.overdue`

**Params:** (none)
**Returns:** `Task[]`

```sql
SELECT * FROM rc_tasks
WHERE status NOT IN ('done','cancelled')
  AND deadline IS NOT NULL AND deadline < datetime('now')
ORDER BY deadline ASC;
```

### 5.9 `rc.task.link`
Link a task to a paper.
- **Params:** `{ taskId: string, paperId: string }`
- **Returns:** `{ linked: true }`

### 5.10 `rc.task.notes.add`
Add a note to a task.
- **Params:** `{ taskId: string, content: string }`
- **Returns:** `{ id: string }`

### 5.11 Error Codes

| Code     | Meaning                     | Used by                         |
|----------|----------------------------|---------------------------------|
| `-32001` | Task not found             | get, update, complete, delete   |
| `-32002` | Invalid parent_task_id     | create, update                  |
| `-32003` | Invalid related_paper_id   | create, update                  |
| `-32004` | Invalid status transition  | update, complete                |
| `-32600` | Invalid request            | All                             |

---

## 6. Cron/Heartbeat Integration

Three preset cron jobs shipped with Research-Claw, plus 3 RPC methods for managing them.

### 6.1 Preset: arXiv Daily Scan

| Field     | Value                                                          |
|-----------|----------------------------------------------------------------|
| ID        | `arxiv_daily_scan`                                             |
| Schedule  | `0 7 * * *` (daily 07:00)                                     |
| Default   | Disabled                                                       |

**When triggered:** Read config keywords, query arXiv for last-24h papers, create `Task` per match (`task_type='agent'`, `priority='low'`, tag `['arxiv-scan']`), emit `radar_digest` card (see `03d`).

**AGENTS.md injection:**
```
When the arXiv daily scan cron runs, summarize findings in a radar_digest card.
Group papers by topic relevance. Flag any papers from tracked authors.
```

### 6.2 Preset: Citation Tracking Weekly

| Field     | Value                                                          |
|-----------|----------------------------------------------------------------|
| ID        | `citation_tracking_weekly`                                     |
| Schedule  | `0 8 * * 1` (Monday 08:00)                                    |
| Default   | Disabled                                                       |

**When triggered:** Read `rc_papers` where `is_own=true` or tagged `['track-citations']`, query Semantic Scholar/CrossRef for new citing papers (last 7 days), create `Task` per citation (`task_type='human'`, `priority='medium'`, linked via `related_paper_id`), emit `radar_digest` card.

**AGENTS.md injection:**
```
When citation tracking runs, create tasks for genuinely relevant citations.
Skip self-citations and preprint duplicates. Link each task to the cited paper.
```

### 6.3 Preset: Deadline Reminders Daily

| Field     | Value                                                          |
|-----------|----------------------------------------------------------------|
| ID        | `deadline_reminders_daily`                                     |
| Schedule  | `0 9 * * *` (daily 09:00)                                     |
| Default   | **Enabled**                                                    |
| Config    | `reminder_window_hours: 48`                                    |

**When triggered:** Call `rc.task.overdue` and `rc.task.upcoming`, emit summary message (no new tasks created). Overdue = red indicator, upcoming = yellow.

**AGENTS.md injection:**
```
When deadline reminder runs, present the summary concisely. For overdue items,
suggest next steps. For upcoming items, estimate feasibility given progress.
```

### 6.4 Cron Preset RPC Methods

#### `rc.cron.presets.list`

**Params:** (none)
**Returns:**

```typescript
interface CronPreset {
  id: string;           // e.g. 'arxiv_daily_scan'
  name: string;         // Human-readable
  description: string;
  schedule: string;     // Cron expression
  enabled: boolean;
  config: Record<string, unknown>;
  last_run_at: string | null;
  next_run_at: string | null;
}
type Result = CronPreset[];
```

#### `rc.cron.presets.activate`

**Params:** `{ preset_id: string, config?: Record<string, unknown> }`
**Returns:** `{ ok: true, preset: CronPreset }`

Creates the underlying cron job via OpenClaw's `cron.create` API. Idempotent.

#### `rc.cron.presets.deactivate`

**Params:** `{ preset_id: string }`
**Returns:** `{ ok: true, preset: CronPreset }`

Removes the cron job via `cron.delete`. Idempotent.

Error `-32001` for unknown `preset_id` on both methods.

### 6.5 HEARTBEAT.md Integration

The task system injects a block into HEARTBEAT.md (see `04`) on each evaluation cycle:

```markdown
## Upcoming Deadlines

{{#if overdue_tasks.length}}
**OVERDUE ({{overdue_tasks.length}}):**
{{#each overdue_tasks}}
- [!] "{{this.title}}" — was due {{this.deadline}} ({{this.priority}})
{{/each}}
{{/if}}

{{#if upcoming_tasks.length}}
**Due within {{reminder_window_hours}}h ({{upcoming_tasks.length}}):**
{{#each upcoming_tasks}}
- "{{this.title}}" — due {{this.deadline}} ({{this.priority}})
{{/each}}
{{/if}}

{{#unless (or overdue_tasks.length upcoming_tasks.length)}}
No pressing deadlines.
{{/unless}}
```

Populated by calling `rc.task.overdue` and `rc.task.upcoming` during heartbeat eval.

---

## 7. Status State Machine

### 7.1 State Diagram

```
                        ┌──────────────────────┐
                        │                      │
                        ▼                      │
    ┌────────┐     ┌────────────┐     ┌────────┴─┐
    │  todo  ├────►│in_progress ├────►│   done   │
    └───┬──┬─┘     └──┬───┬──┬─┘     └──────────┘
        │  │          │   │  │
        │  │          │   │  └───────────────┐
        │  │          ▼   │                  │
        │  │     ┌────────┴──┐               │
        │  │     │  blocked  ├───────────────┘
        │  │     └─────┬─────┘
        │  │           │
        │  ▼           ▼
        │ ┌────────────────┐
        └►│   cancelled    │
          └────────────────┘
```

### 7.2 Transition Table

| From           | To             | Allowed | Notes                                |
|----------------|----------------|---------|--------------------------------------|
| `todo`         | `in_progress`  | Yes     | Work begins                          |
| `todo`         | `cancelled`    | Yes     | Abandoned before starting            |
| `in_progress`  | `done`         | Yes     | Work completed                       |
| `in_progress`  | `blocked`      | Yes     | Waiting on dependency                |
| `in_progress`  | `todo`         | Yes     | **Back-transition**: reset to backlog |
| `in_progress`  | `cancelled`    | Yes     | Abandoned mid-work                   |
| `blocked`      | `in_progress`  | Yes     | **Back-transition**: blocker resolved |
| `blocked`      | `done`         | Yes     | Resolved directly from blocked       |
| `blocked`      | `cancelled`    | Yes     | Abandoned while blocked              |
| `done`         | *any*          | **No**  | Terminal — create a new task instead  |
| `cancelled`    | *any*          | **No**  | Terminal — create a new task instead  |
| `todo`         | `done`         | **No**  | Must pass through `in_progress`      |
| `todo`         | `blocked`      | **No**  | Cannot block what hasn't started     |

### 7.3 Transition Validation

```typescript
// src/lib/task-state-machine.ts

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo:        ['in_progress', 'cancelled'],
  in_progress: ['done', 'blocked', 'todo', 'cancelled'],
  blocked:     ['in_progress', 'done', 'cancelled'],
  done:        [],
  cancelled:   [],
};

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from].includes(to);
}

export function validateTransition(from: TaskStatus, to: TaskStatus): void {
  if (!isValidTransition(from, to)) {
    throw new Error(
      `Invalid status transition: ${from} -> ${to}. `
      + `Allowed from "${from}": [${VALID_TRANSITIONS[from].join(', ')}]`
    );
  }
}
```

### 7.4 Side Effects on Transition

| Transition            | Side Effect                                          |
|-----------------------|------------------------------------------------------|
| `* -> done`           | Set `completed_at = now()`                           |
| `* -> cancelled`      | Clear `completed_at` if set (defensive)              |
| `in_progress -> todo` | Clear `agent_session_id` if set                      |

---

## 8. Cross-References

### 8.1 Incoming

| From Doc | Reference                                              |
|----------|--------------------------------------------------------|
| `02`     | Cron RPC infrastructure (`rc.cron.*` CRUD)             |
| `03d`    | `task_card` message card type displays task data       |
| `03f`    | Plugin aggregation registers task tools and RPC        |
| `04`     | HEARTBEAT.md reads `rc.task.upcoming` / `rc.task.overdue` |

### 8.2 Outgoing

| To Doc | Reference                                                |
|--------|----------------------------------------------------------|
| `02`   | Gateway WS RPC protocol, cron infrastructure, plugin SDK |
| `03a`  | `rc_papers` table FK, `is_own` flag, library tools       |
| `03d`  | `radar_digest` and `task_card` message card types        |
| `04`   | HEARTBEAT.md template injection                          |

### 8.3 This Document Is Source of Truth For

- `rc_tasks` and `rc_activity_log` table schemas
- 6 agent tools: `task_create`, `task_list`, `task_complete`, `task_update`, `task_link`, `task_note`
- 10 RPC methods: `rc.task.{list,get,create,update,complete,delete,upcoming,overdue,link,notes.add}`
- 3 RPC methods: `rc.cron.presets.{list,activate,deactivate}`
- Status state machine (transitions + side effects)
- 3 cron presets: `arxiv_daily_scan`, `citation_tracking_weekly`, `deadline_reminders_daily`

---

## Appendix A: Key SQL Recipes

### A.1 Main List Query (Default View)

```sql
SELECT *,
  CASE
    WHEN status IN ('done','cancelled') THEN 3
    WHEN deadline IS NOT NULL AND deadline < datetime('now') THEN 0
    WHEN deadline IS NOT NULL THEN 1
    ELSE 2
  END AS sort_bucket,
  CASE priority
    WHEN 'urgent' THEN 0  WHEN 'high' THEN 1
    WHEN 'medium' THEN 2  WHEN 'low'  THEN 3
  END AS priority_weight
FROM rc_tasks
WHERE status NOT IN ('done','cancelled')
ORDER BY sort_bucket ASC,
  CASE WHEN sort_bucket IN (0,1) THEN deadline END ASC,
  priority_weight ASC, created_at ASC
LIMIT :limit OFFSET :offset;
```

### A.2 Tasks Linked to a Paper

```sql
SELECT * FROM rc_tasks
WHERE related_paper_id = :paper_id
ORDER BY
  CASE status
    WHEN 'in_progress' THEN 0  WHEN 'todo' THEN 1
    WHEN 'blocked' THEN 2      WHEN 'done' THEN 3
    WHEN 'cancelled' THEN 4
  END ASC, deadline ASC;
```

### A.3 Agent Activity Summary (Last 24h)

```sql
SELECT event_type, COUNT(*) AS count
FROM rc_activity_log
WHERE actor = 'agent' AND created_at >= datetime('now','-24 hours')
GROUP BY event_type ORDER BY count DESC;
```

---

## Appendix B: Dashboard Wire Reference

> Full UI engineering in `03e`. Minimal wire for data-shape context.

```
┌─────────────────────────────────────────────────────────────┐
│  Tasks                          [All | My Tasks | Agent]    │
│                                 [+ New Task]                │
├─────────────────────────────────────────────────────────────┤
│  OVERDUE (2)                                                │
│  ! Review ICML draft ──── urgent ──── was due Mar 9         │
│  ! Submit ethics form ─── high ────── was due Mar 10        │
│                                                             │
│  UPCOMING                                                   │
│  ○ Finalize figures ───── high ────── due Mar 13            │
│  ○ Run ablation study ─── medium ──── due Mar 15            │
│                                                             │
│  NO DEADLINE                                                │
│  ○ Explore LoRA variants ── low ──── no deadline            │
│                                                             │
│  ▾ Completed (14)                              [collapsed]  │
└─────────────────────────────────────────────────────────────┘
```

---

*End of document. Single source of truth for the task system module.*
*Next: `03c` (Workspace & Git Tracking) or `03d` (Message Card Protocol).*
