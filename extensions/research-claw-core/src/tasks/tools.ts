/**
 * Research-Claw Core — Task Agent Tools
 *
 * 6 agent tools for the task management module:
 *   1. task_create   — Create a new research task
 *   2. task_list     — List/filter tasks with smart sorting
 *   3. task_complete — Mark a task as done
 *   4. task_update   — Update task fields (state-machine validated)
 *   5. task_link     — Link a task to a paper
 *   6. task_note     — Append a timestamped note to a task
 *
 * Each tool uses plain JSON Schema objects for parameters (no TypeBox).
 * Registered via api.registerTool() from the OpenClaw plugin SDK.
 */

// Note: Tool parameters use raw JSON Schema objects for simplicity.
// The spec suggests TypeBox (@sinclair/typebox) but raw schemas are
// functionally equivalent and avoid an additional abstraction layer.

import {
  TaskService,
  type Task,
  type TaskInput,
  type TaskPatch,
  type TaskType,
  type TaskStatus,
  type TaskPriority,
} from './service.js';
import type { ToolDefinition } from '../types.js';

// ── Helpers ──────────────────────────────────────────────────────────────

function ok(text: string, details: unknown): unknown {
  return { content: [{ type: 'text', text }], details };
}

function fail(message: string): unknown {
  return { content: [{ type: 'text', text: `Error: ${message}` }], details: { error: message } };
}

function formatTask(task: Task): string {
  const parts = [
    `[${task.status.toUpperCase()}] ${task.title}`,
    `  id: ${task.id}`,
    `  type: ${task.task_type} | priority: ${task.priority}`,
  ];
  if (task.deadline) {
    parts.push(`  deadline: ${task.deadline}`);
  }
  if (task.description) {
    parts.push(`  description: ${task.description}`);
  }
  if (task.related_paper_id) {
    parts.push(`  linked paper: ${task.related_paper_id}`);
  }
  if (task.tags.length > 0) {
    parts.push(`  tags: ${task.tags.join(', ')}`);
  }
  if (task.notes) {
    const preview = task.notes.length > 120 ? task.notes.slice(0, 120) + '...' : task.notes;
    parts.push(`  notes: ${preview}`);
  }
  return parts.join('\n');
}

// ── Registration ─────────────────────────────────────────────────────────

export function createTaskTools(service: TaskService): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  // ── 1. task_create ──────────────────────────────────────────────────

  tools.push({
    name: 'task_create',
    description:
      'Create a new research task. Use this to track work items like reading papers, ' +
      'running experiments, writing sections, or coordinating agent sub-tasks.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short descriptive title for the task' },
        task_type: {
          type: 'string',
          enum: ['human', 'agent', 'mixed'],
          description: 'Who will perform this task: human, agent, or mixed',
        },
        description: { type: 'string', description: 'Detailed description of what needs to be done' },
        priority: {
          type: 'string',
          enum: ['urgent', 'high', 'medium', 'low'],
          description: 'Task priority level',
        },
        deadline: { type: 'string', description: 'ISO 8601 deadline string (e.g. 2026-03-15T09:00:00Z)' },
        parent_task_id: { type: 'string', description: 'UUID of a parent task to create this as a subtask' },
        related_paper_id: { type: 'string', description: 'UUID of a paper to link to this task' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 20,
          description: 'Tags for categorization (max 20)',
        },
        notes: { type: 'string', description: 'Initial notes to attach to the task' },
      },
      required: ['title', 'task_type'],
    },
    async execute(params: Record<string, unknown>): Promise<unknown> {
      try {
        const input: TaskInput = {
          title: params.title as string,
          task_type: params.task_type as TaskInput['task_type'],
          description: params.description as string | undefined,
          priority: params.priority as TaskInput['priority'],
          deadline: params.deadline as string | undefined,
          parent_task_id: params.parent_task_id as string | undefined,
          related_paper_id: params.related_paper_id as string | undefined,
          tags: params.tags as string[] | undefined,
          notes: params.notes as string | undefined,
        };

        const task = service.create(input, 'agent');

        const summary = [
          `Created task "${task.title}" (${task.id})`,
          `  type: ${task.task_type} | priority: ${task.priority} | status: ${task.status}`,
        ];
        if (task.deadline) summary.push(`  deadline: ${task.deadline}`);
        if (task.parent_task_id) summary.push(`  parent: ${task.parent_task_id}`);
        if (task.related_paper_id) summary.push(`  linked paper: ${task.related_paper_id}`);

        return ok(summary.join('\n'), task);
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 2. task_list ────────────────────────────────────────────────────

  tools.push({
    name: 'task_list',
    description:
      'List research tasks with optional filters. Returns active tasks by default ' +
      '(excludes done/cancelled). Use to get an overview of current work.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'blocked', 'done', 'cancelled'],
          description: 'Filter by task status',
        },
        priority: {
          type: 'string',
          enum: ['urgent', 'high', 'medium', 'low'],
          description: 'Filter by priority level',
        },
        task_type: {
          type: 'string',
          enum: ['human', 'agent', 'mixed'],
          description: 'Filter by task type',
        },
        sort_by: {
          type: 'string',
          enum: ['deadline', 'priority', 'created_at'],
          description: 'Sort field (default: smart deadline bucketing)',
        },
        include_completed: {
          type: 'boolean',
          description: 'Include done/cancelled tasks (default: false)',
        },
      },
    },
    async execute(params: Record<string, unknown>): Promise<unknown> {
      try {
        const result = service.list({
          status: params.status as TaskStatus | undefined,
          priority: params.priority as TaskPriority | undefined,
          task_type: params.task_type as TaskType | undefined,
          sort: params.sort_by as string | undefined,
          include_completed: (params.include_completed as boolean) ?? false,
        });

        let summary: string;
        if (result.items.length === 0) {
          summary = `No tasks found (total: ${result.total}).`;
        } else {
          const lines = [
            `Found ${result.items.length} task(s) (total: ${result.total}):`,
            '',
          ];
          for (const task of result.items) {
            lines.push(formatTask(task));
            lines.push('');
          }
          summary = lines.join('\n');
        }

        return ok(summary, result);
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 3. task_complete ────────────────────────────────────────────────

  tools.push({
    name: 'task_complete',
    description:
      'Mark a task as completed. Optionally attach completion notes. ' +
      'Only works on tasks in in_progress or blocked status.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'UUID of the task to complete' },
        notes: { type: 'string', description: 'Optional completion notes' },
      },
      required: ['id'],
    },
    async execute(params: Record<string, unknown>): Promise<unknown> {
      try {
        const id = params.id as string;
        const notes = params.notes as string | undefined;

        const task = service.complete(id, notes, 'agent');

        const summary = [
          `Completed task "${task.title}" (${task.id})`,
          `  completed_at: ${task.completed_at ?? 'N/A'}`,
        ];
        if (notes) summary.push(`  completion notes: ${notes}`);

        return ok(summary.join('\n'), task);
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 4. task_update ──────────────────────────────────────────────────

  tools.push({
    name: 'task_update',
    description:
      'Update one or more fields of an existing task. Status changes are validated ' +
      'against the state machine (e.g. done tasks cannot be reopened).',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'UUID of the task to update' },
        title: { type: 'string', description: 'New title' },
        description: {
          type: ['string', 'null'],
          description: 'New description (null to clear)',
        },
        task_type: {
          type: 'string',
          enum: ['human', 'agent', 'mixed'],
          description: 'New task type',
        },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'blocked', 'done', 'cancelled'],
          description: 'New status (state-machine validated)',
        },
        priority: {
          type: 'string',
          enum: ['urgent', 'high', 'medium', 'low'],
          description: 'New priority level',
        },
        deadline: {
          type: ['string', 'null'],
          description: 'New deadline ISO 8601 (null to clear)',
        },
        parent_task_id: {
          type: ['string', 'null'],
          description: 'Reassign parent (null to detach)',
        },
        related_paper_id: {
          type: ['string', 'null'],
          description: 'Link to a different paper (null to unlink)',
        },
        agent_session_id: {
          type: ['string', 'null'],
          description: 'Associate with an agent session',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 20,
          description: 'Replace tags array (max 20)',
        },
        notes: {
          type: ['string', 'null'],
          description: 'Replace notes (null to clear)',
        },
      },
      required: ['id'],
    },
    async execute(params: Record<string, unknown>): Promise<unknown> {
      try {
        const id = params.id as string;

        const patch: TaskPatch = {};

        if (params.title !== undefined) patch.title = params.title as string;
        if (params.description !== undefined) patch.description = params.description as string | null;
        if (params.task_type !== undefined) patch.task_type = params.task_type as TaskPatch['task_type'];
        if (params.status !== undefined) patch.status = params.status as TaskPatch['status'];
        if (params.priority !== undefined) patch.priority = params.priority as TaskPatch['priority'];
        if (params.deadline !== undefined) patch.deadline = params.deadline as string | null;
        if (params.parent_task_id !== undefined) patch.parent_task_id = params.parent_task_id as string | null;
        if (params.related_paper_id !== undefined) patch.related_paper_id = params.related_paper_id as string | null;
        if (params.agent_session_id !== undefined) patch.agent_session_id = params.agent_session_id as string | null;
        if (params.tags !== undefined) patch.tags = params.tags as string[];
        if (params.notes !== undefined) patch.notes = params.notes as string | null;

        const task = service.update(id, patch, 'agent');

        const changedFields = Object.keys(params).filter((k) => k !== 'id' && params[k] !== undefined);
        const summary = [
          `Updated task "${task.title}" (${task.id})`,
          `  changed fields: ${changedFields.length > 0 ? changedFields.join(', ') : 'none'}`,
          `  status: ${task.status} | priority: ${task.priority}`,
        ];

        return ok(summary.join('\n'), task);
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 5. task_link ────────────────────────────────────────────────────

  tools.push({
    name: 'task_link',
    description:
      'Link a task to a paper in the literature database. ' +
      'This associates the task with a specific paper for cross-referencing.',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID of the task' },
        paper_id: { type: 'string', description: 'UUID of the paper to link' },
      },
      required: ['task_id', 'paper_id'],
    },
    async execute(params: Record<string, unknown>): Promise<unknown> {
      try {
        const taskId = params.task_id as string;
        const paperId = params.paper_id as string;

        service.link(taskId, paperId);

        return ok(
          `Linked task ${taskId} to paper ${paperId}.`,
          { task_id: taskId, paper_id: paperId, ok: true },
        );
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 6. task_note ────────────────────────────────────────────────────

  tools.push({
    name: 'task_note',
    description:
      'Append a note to a task. Notes are timestamped and attributed to the actor ' +
      '(human or agent). Use this to log progress, observations, or decisions.',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID of the task to annotate' },
        note: { type: 'string', minLength: 1, description: 'Note content (must not be empty)' },
      },
      required: ['task_id', 'note'],
    },
    async execute(params: Record<string, unknown>): Promise<unknown> {
      try {
        const taskId = params.task_id as string;
        const note = params.note as string;

        const entry = service.addNote(taskId, note, 'agent');

        const summary = [
          `Added note to task ${taskId}:`,
          `  "${note.length > 100 ? note.slice(0, 100) + '...' : note}"`,
          `  logged at: ${entry.created_at}`,
        ].join('\n');

        return ok(summary, entry);
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  return tools;
}
