import { create } from 'zustand';
import type { ChatMessage, ChatStreamEvent, ChatAttachment } from '../gateway/types';
import { useGatewayStore } from './gateway';

const SILENT_REPLY_PATTERN = /^\s*NO_REPLY\s*$/;

function isSilentReply(text: string | undefined): boolean {
  return text !== undefined && SILENT_REPLY_PATTERN.test(text);
}

function extractText(msg: ChatMessage): string {
  if (msg.text) return msg.text;
  if (msg.content) {
    return msg.content
      .filter((c) => c.type === 'text' && c.text)
      .map((c) => c.text!)
      .join('');
  }
  return '';
}

interface ChatState {
  messages: ChatMessage[];
  sending: boolean;
  streaming: boolean;
  streamText: string | null;
  runId: string | null;
  sessionKey: string;
  lastError: string | null;
  tokensIn: number;
  tokensOut: number;

  send: (text: string, attachments?: ChatAttachment[]) => Promise<void>;
  abort: () => void;
  loadHistory: () => Promise<void>;
  handleChatEvent: (event: ChatStreamEvent) => void;
  setSessionKey: (key: string) => void;
  clearError: () => void;
  updateTokens: (input: number, output: number) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  sending: false,
  streaming: false,
  streamText: null,
  runId: null,
  sessionKey: 'default',
  lastError: null,
  tokensIn: 0,
  tokensOut: 0,

  send: async (text: string, _attachments?: ChatAttachment[]) => {
    const client = useGatewayStore.getState().client;
    if (!client || !client.isConnected) {
      set({ lastError: 'Not connected to gateway' });
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    set((s) => ({
      messages: [...s.messages, userMessage],
      sending: true,
      lastError: null,
      streamText: null,
    }));

    try {
      const result = await client.request<{ runId: string }>('chat.send', {
        message: text,
        sessionKey: get().sessionKey,
      });
      set({ runId: result.runId, sending: false, streaming: true });
    } catch (err) {
      set({
        sending: false,
        lastError: err instanceof Error ? err.message : 'Failed to send message',
      });
    }
  },

  abort: () => {
    const client = useGatewayStore.getState().client;
    const { runId } = get();
    if (client && client.isConnected && runId) {
      client.request('chat.abort', { runId }).catch((err) => {
        console.warn('[Chat] Abort failed:', err);
      });
    }
  },

  loadHistory: async () => {
    const client = useGatewayStore.getState().client;
    if (!client || !client.isConnected) return;

    try {
      const result = await client.request<{ messages: ChatMessage[] }>('chat.history', {
        sessionKey: get().sessionKey,
      });
      set({ messages: result.messages ?? [] });
    } catch {
      // History load failure is non-fatal
    }
  },

  handleChatEvent: (event: ChatStreamEvent) => {
    const { runId } = get();

    switch (event.state) {
      case 'delta': {
        if (event.runId !== runId) return;
        const deltaText = event.message ? extractText(event.message) : '';
        set((s) => ({
          streaming: true,
          streamText: (s.streamText ?? '') + deltaText,
        }));
        break;
      }

      case 'final': {
        if (!event.message) return;
        const text = extractText(event.message);
        if (isSilentReply(text)) return;

        const finalMsg: ChatMessage = {
          ...event.message,
          text,
          timestamp: event.message.timestamp ?? Date.now(),
        };

        if (event.runId === runId) {
          set((s) => ({
            messages: [...s.messages, finalMsg],
            streaming: false,
            streamText: null,
            runId: null,
          }));
        } else {
          // Sub-agent or different run
          set((s) => ({
            messages: [...s.messages, finalMsg],
          }));
        }
        break;
      }

      case 'aborted': {
        const partialText = get().streamText;
        if (partialText) {
          const abortedMsg: ChatMessage = {
            role: 'assistant',
            text: partialText,
            timestamp: Date.now(),
          };
          set((s) => ({
            messages: [...s.messages, abortedMsg],
            streaming: false,
            streamText: null,
            runId: null,
          }));
        } else {
          set({ streaming: false, streamText: null, runId: null });
        }
        break;
      }

      case 'error': {
        set({
          streaming: false,
          streamText: null,
          runId: null,
          lastError: event.errorMessage ?? 'Unknown streaming error',
        });
        break;
      }
    }
  },

  setSessionKey: (key: string) => {
    set({ sessionKey: key, messages: [], streamText: null, runId: null });
  },

  clearError: () => {
    set({ lastError: null });
  },

  updateTokens: (input: number, output: number) => {
    set((s) => ({
      tokensIn: s.tokensIn + input,
      tokensOut: s.tokensOut + output,
    }));
  },
}));
