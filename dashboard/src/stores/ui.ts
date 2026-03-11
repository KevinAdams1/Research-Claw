import { create } from 'zustand';

export type PanelTab = 'library' | 'workspace' | 'tasks' | 'radar' | 'settings';

export type AgentStatus = 'idle' | 'thinking' | 'tool_running' | 'streaming' | 'error' | 'disconnected';

export interface Notification {
  id: string;
  type: 'deadline' | 'heartbeat' | 'system' | 'error';
  title: string;
  body?: string;
  timestamp: string;
  read: boolean;
  chatMessageId?: string;
}

interface UiState {
  rightPanelTab: PanelTab;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
  leftNavCollapsed: boolean;
  notifications: Notification[];
  unreadCount: number;
  agentStatus: AgentStatus;

  setRightPanelTab: (tab: PanelTab) => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  setRightPanelWidth: (width: number) => void;
  toggleLeftNav: () => void;
  setLeftNavCollapsed: (collapsed: boolean) => void;
  setAgentStatus: (status: AgentStatus) => void;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  rightPanelTab: 'library',
  rightPanelOpen: true,
  rightPanelWidth: 360,
  leftNavCollapsed: false,
  notifications: [],
  unreadCount: 0,
  agentStatus: 'disconnected',

  setRightPanelTab: (tab: PanelTab) => {
    set({ rightPanelTab: tab, rightPanelOpen: true });
  },

  toggleRightPanel: () => {
    set((s) => ({ rightPanelOpen: !s.rightPanelOpen }));
  },

  setRightPanelOpen: (open: boolean) => {
    set({ rightPanelOpen: open });
  },

  setRightPanelWidth: (width: number) => {
    set({ rightPanelWidth: Math.min(480, Math.max(320, width)) });
  },

  toggleLeftNav: () => {
    set((s) => ({ leftNavCollapsed: !s.leftNavCollapsed }));
  },

  setLeftNavCollapsed: (collapsed: boolean) => {
    set({ leftNavCollapsed: collapsed });
  },

  setAgentStatus: (status: AgentStatus) => {
    set({ agentStatus: status });
  },

  addNotification: (n) => {
    const notification: Notification = {
      ...n,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    set((s) => ({
      notifications: [notification, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    }));
  },

  markNotificationRead: (id: string) => {
    set((s) => {
      const found = s.notifications.find((n) => n.id === id && !n.read);
      return {
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        unreadCount: found ? s.unreadCount - 1 : s.unreadCount,
      };
    });
  },

  markAllNotificationsRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));
