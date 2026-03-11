/**
 * React hooks for gateway interaction.
 *
 * TODO: Full implementation in Phase 4 (03e-dashboard-ui.md)
 *
 * Hooks:
 * - useGateway()  — client singleton + connection state
 * - useRpc<T>()   — declarative RPC with loading/error
 * - useEvent()    — subscribe/unsubscribe on mount/unmount
 * - useChat()     — streaming chat (delta/final/aborted/error)
 */

export function useGateway() {
  // TODO: Return { client, state, connect, disconnect }
  return { client: null, state: 'disconnected' as const };
}

export function useRpc<T>(_method: string, _params?: unknown, _deps?: unknown[]) {
  // TODO: Return { data, loading, error, refetch }
  return { data: null as T | null, loading: false, error: null };
}

export function useEvent(_event: string, _handler: (payload: unknown) => void) {
  // TODO: Subscribe on mount, unsubscribe on unmount
}

export function useChat() {
  // TODO: Return { messages, send, abort, loading, streaming }
  return { messages: [], send: async (_msg: string) => {}, abort: () => {}, loading: false, streaming: false };
}
