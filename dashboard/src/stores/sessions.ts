import { create } from 'zustand';

export interface Session {
  key: string;
  label?: string;
  createdAt: string;
  lastMessageAt?: string;
  messageCount: number;
}

interface SessionsState {
  sessions: Session[];
  activeSessionKey: string | null;
  loading: boolean;

  // Skeleton — awaiting S2 plugin implementation
  loadSessions: () => Promise<void>;
  switchSession: (key: string) => void;
  createSession: () => Promise<string>;
  deleteSession: (key: string) => Promise<void>;
}

export const useSessionsStore = create<SessionsState>()((set) => ({
  sessions: [],
  activeSessionKey: null,
  loading: false,

  loadSessions: async () => {
    // TODO: S2 — call sessions.list via gateway
    set({ loading: false });
  },

  switchSession: (key: string) => {
    set({ activeSessionKey: key });
  },

  createSession: async () => {
    // TODO: S2 — call sessions.create via gateway
    return 'default';
  },

  deleteSession: async (_key: string) => {
    // TODO: S2 — call sessions.delete via gateway
  },
}));
