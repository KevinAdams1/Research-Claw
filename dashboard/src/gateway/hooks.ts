import { useCallback, useEffect, useRef, useState } from 'react';
import { useGatewayStore } from '../stores/gateway';
import { useChatStore } from '../stores/chat';
import type { ConnectionState, ChatMessage, ChatAttachment } from './types';
import type { GatewayClient } from './client';

/**
 * useGateway — singleton client access + connection state.
 */
export function useGateway(): {
  client: GatewayClient | null;
  state: ConnectionState;
  serverVersion: string | null;
  connect: (url: string) => void;
  disconnect: () => void;
} {
  const client = useGatewayStore((s) => s.client);
  const state = useGatewayStore((s) => s.state);
  const serverVersion = useGatewayStore((s) => s.serverVersion);
  const connect = useGatewayStore((s) => s.connect);
  const disconnect = useGatewayStore((s) => s.disconnect);

  return { client, state, serverVersion, connect, disconnect };
}

/**
 * useRpc — declarative RPC with loading/error/refetch.
 */
export function useRpc<T>(
  method: string,
  params?: unknown,
  deps: unknown[] = [],
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const client = useGatewayStore((s) => s.client);
  const state = useGatewayStore((s) => s.state);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!client || state !== 'connected') return;
    setLoading(true);
    setError(null);
    try {
      const result = await client.request<T>(method, params);
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, state, method, ...deps]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => {
      mountedRef.current = false;
    };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * useEvent — subscribe to gateway event on mount, unsubscribe on unmount.
 */
export function useEvent(
  eventName: string,
  handler: (payload: unknown) => void,
): void {
  const client = useGatewayStore((s) => s.client);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!client) return;

    const unsub = client.subscribe(eventName, (payload: unknown) => {
      handlerRef.current(payload);
    });

    return unsub;
  }, [client, eventName]);
}

/**
 * useChat — streaming chat with send/abort.
 */
export function useChat(): {
  messages: ChatMessage[];
  send: (text: string, attachments?: ChatAttachment[]) => Promise<void>;
  abort: () => void;
  loading: boolean;
  streaming: boolean;
  streamText: string | null;
  error: string | null;
} {
  const messages = useChatStore((s) => s.messages);
  const send = useChatStore((s) => s.send);
  const abort = useChatStore((s) => s.abort);
  const sending = useChatStore((s) => s.sending);
  const streaming = useChatStore((s) => s.streaming);
  const streamText = useChatStore((s) => s.streamText);
  const lastError = useChatStore((s) => s.lastError);

  return {
    messages,
    send,
    abort,
    loading: sending,
    streaming,
    streamText,
    error: lastError,
  };
}
