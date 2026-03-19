import { create } from 'zustand';

/**
 * Tracks live tool execution events from the gateway's `agent` event stream.
 *
 * Agent events come in two flavors:
 * 1. Status events: { state: "thinking" | "tool_running" | "streaming" | "idle" | "error" }
 *    — Broadcast to all clients, used by the status dot and background activity bar.
 * 2. Detailed events: { stream: "tool" | "lifecycle", data: { phase, name, toolCallId, ... } }
 *    — Only sent to clients with caps: ["tool-events"] for tool stream,
 *      or broadcast for lifecycle/assistant/error streams.
 */

export interface PendingTool {
  toolCallId: string;
  name: string;
  phase: 'start' | 'running' | 'result' | 'end';
  startedAt: number;
}

export interface AgentActivity {
  runId: string;
  isBackground: boolean;
  currentTool: string | null;
  status: string;
  startedAt: number;
}

interface ToolStreamState {
  /** Active tools for the current foreground run — displayed inline in ChatView. */
  pendingTools: PendingTool[];
  /** Background activity — displayed in the AgentActivityBar. */
  bgActivity: AgentActivity | null;

  handleAgentEvent: (payload: unknown, chatRunId: string | null) => void;
  clearAll: () => void;
}

const ACTIVE_STATES = new Set(['thinking', 'tool_running', 'streaming']);

export const useToolStreamStore = create<ToolStreamState>()((set, get) => ({
  pendingTools: [],
  bgActivity: null,

  handleAgentEvent: (payload: unknown, chatRunId: string | null) => {
    const evt = payload as {
      runId?: string;
      state?: string;
      stream?: string;
      data?: {
        phase?: string;
        name?: string;
        toolName?: string;
        toolCallId?: string;
      };
    };

    // Background = different runId from the user's active chat, or no active chat.
    const isBackground = !!evt.runId && (!chatRunId || evt.runId !== chatRunId);

    // ── Path A: Status-only events (state field, no stream) ──
    // These are broadcast to ALL clients. The status dot uses them.
    // We use them for background activity detection (P1-3).
    if (evt.state && !evt.stream) {
      if (isBackground && ACTIVE_STATES.has(evt.state)) {
        set({
          bgActivity: {
            runId: evt.runId!,
            isBackground: true,
            currentTool: null,
            status: evt.state,
            startedAt: get().bgActivity?.runId === evt.runId
              ? get().bgActivity!.startedAt
              : Date.now(),
          },
        });
      } else if (evt.state === 'idle' || evt.state === 'error') {
        // Any idle/error clears background activity
        if (get().bgActivity?.runId === evt.runId || !evt.runId) {
          set({ bgActivity: null });
        }
      }
      return;
    }

    // ── Path B: Detailed events (stream + data fields) ──
    // Tool events require caps: ["tool-events"] registration.
    if (!evt.stream || !evt.data) return;

    // Handle tool stream events
    if (evt.stream === 'tool' && evt.data.phase && evt.data.toolCallId) {
      const { phase, toolCallId } = evt.data;
      const name = evt.data.name ?? evt.data.toolName;

      if (!isBackground) {
        // Foreground: update pendingTools for inline chat display
        switch (phase) {
          case 'start':
            set((s) => ({
              pendingTools: [
                ...s.pendingTools,
                { toolCallId, name: name ?? 'unknown', phase: 'start', startedAt: Date.now() },
              ],
            }));
            break;
          case 'running':
            set((s) => ({
              pendingTools: s.pendingTools.map((t) =>
                t.toolCallId === toolCallId ? { ...t, phase: 'running' } : t,
              ),
            }));
            break;
          case 'result':
            set((s) => ({
              pendingTools: s.pendingTools.map((t) =>
                t.toolCallId === toolCallId ? { ...t, phase: 'result' } : t,
              ),
            }));
            break;
          case 'end':
            setTimeout(() => {
              set((s) => ({
                pendingTools: s.pendingTools.filter((t) => t.toolCallId !== toolCallId),
              }));
            }, 800);
            set((s) => ({
              pendingTools: s.pendingTools.map((t) =>
                t.toolCallId === toolCallId ? { ...t, phase: 'end' } : t,
              ),
            }));
            break;
        }
      } else {
        // Background: update bgActivity with tool name
        if (phase === 'start' || phase === 'running') {
          set({
            bgActivity: {
              runId: evt.runId!,
              isBackground: true,
              currentTool: name ?? null,
              status: 'tool_running',
              startedAt: get().bgActivity?.runId === evt.runId
                ? get().bgActivity!.startedAt
                : Date.now(),
            },
          });
        }
      }
    }

    // Handle lifecycle events for background activity
    if (evt.stream === 'lifecycle' && isBackground) {
      const lifecyclePhase = evt.data.phase;
      if (lifecyclePhase === 'start') {
        set({
          bgActivity: {
            runId: evt.runId!,
            isBackground: true,
            currentTool: null,
            status: 'thinking',
            startedAt: Date.now(),
          },
        });
      } else if (lifecyclePhase === 'end' || lifecyclePhase === 'error') {
        if (get().bgActivity?.runId === evt.runId) {
          set({ bgActivity: null });
        }
      }
    }
  },

  clearAll: () => {
    set({ pendingTools: [], bgActivity: null });
  },
}));
