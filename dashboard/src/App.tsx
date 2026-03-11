import React, { useEffect, useCallback, Suspense } from 'react';
import { ConfigProvider, Spin } from 'antd';
import { getAntdThemeConfig } from './styles/theme';
import { useConfigStore } from './stores/config';
import { useGatewayStore } from './stores/gateway';
import { useChatStore } from './stores/chat';
import { useUiStore } from './stores/ui';
import TopBar from './components/TopBar';
import LeftNav from './components/LeftNav';
import ChatView from './components/chat/ChatView';
import RightPanel from './components/RightPanel';
import StatusBar from './components/StatusBar';
import SetupWizard from './components/setup/SetupWizard';
import type { ChatStreamEvent } from './gateway/types';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL ?? 'ws://127.0.0.1:18789';

const BP_MOBILE = 1024;
const BP_TABLET = 1440;

export default function App() {
  const theme = useConfigStore((s) => s.theme);
  const setupComplete = useConfigStore((s) => s.setupComplete);
  const loadConfig = useConfigStore((s) => s.loadConfig);
  const connect = useGatewayStore((s) => s.connect);
  const client = useGatewayStore((s) => s.client);
  const connState = useGatewayStore((s) => s.state);
  const handleChatEvent = useChatStore((s) => s.handleChatEvent);
  const loadHistory = useChatStore((s) => s.loadHistory);
  const setAgentStatus = useUiStore((s) => s.setAgentStatus);
  const leftNavCollapsed = useUiStore((s) => s.leftNavCollapsed);
  const rightPanelOpen = useUiStore((s) => s.rightPanelOpen);
  const rightPanelWidth = useUiStore((s) => s.rightPanelWidth);

  // Load persisted config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Auto-connect gateway when setup is complete
  useEffect(() => {
    if (setupComplete) {
      connect(GATEWAY_URL);
    }
  }, [setupComplete, connect]);

  // Subscribe to chat events
  useEffect(() => {
    if (!client) return;

    const unsubChat = client.subscribe('chat.message', (payload) => {
      handleChatEvent(payload as ChatStreamEvent);
    });

    const unsubAgent = client.subscribe('agent.status', (payload) => {
      const status = payload as { state?: string };
      if (status.state) {
        setAgentStatus(status.state as 'idle' | 'thinking' | 'tool_running' | 'streaming' | 'error');
      }
    });

    return () => {
      unsubChat();
      unsubAgent();
    };
  }, [client, handleChatEvent, setAgentStatus]);

  // Load history on connection
  useEffect(() => {
    if (connState === 'connected') {
      loadHistory();
      setAgentStatus('idle');
    } else if (connState === 'disconnected' || connState === 'reconnecting') {
      setAgentStatus('disconnected');
    }
  }, [connState, loadHistory, setAgentStatus]);

  const setLeftNavCollapsed = useUiStore((s) => s.setLeftNavCollapsed);
  const setRightPanelOpen = useUiStore((s) => s.setRightPanelOpen);

  // Responsive breakpoint listener
  const handleResize = useCallback(() => {
    const w = window.innerWidth;
    if (w < BP_MOBILE) {
      setLeftNavCollapsed(true);
      setRightPanelOpen(false);
    } else if (w < BP_TABLET) {
      // 2-column: right panel as overlay (managed by toggle), left nav stays
      setRightPanelOpen(false);
    }
  }, [setLeftNavCollapsed, setRightPanelOpen]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const antdTheme = getAntdThemeConfig(theme);

  if (!setupComplete) {
    return (
      <ConfigProvider theme={antdTheme}>
        <SetupWizard />
      </ConfigProvider>
    );
  }

  const leftNavWidth = leftNavCollapsed ? 56 : 240;

  return (
    <ConfigProvider theme={antdTheme}>
      <div
        style={{
          height: '100vh',
          display: 'grid',
          gridTemplateRows: '48px 1fr 28px',
          gridTemplateColumns: `${leftNavWidth}px 1fr ${rightPanelOpen ? `${rightPanelWidth}px` : '0px'}`,
          gridTemplateAreas: `
            "topbar topbar topbar"
            "leftnav chat rightpanel"
            "statusbar statusbar statusbar"
          `,
          background: 'var(--bg)',
          overflow: 'hidden',
        }}
      >
        <header style={{ gridArea: 'topbar' }}>
          <TopBar />
        </header>

        <aside
          style={{
            gridArea: 'leftnav',
            borderRight: '1px solid var(--border)',
            overflow: 'hidden',
            transition: 'width 0.2s ease',
          }}
        >
          <LeftNav />
        </aside>

        <main style={{ gridArea: 'chat', overflow: 'hidden' }}>
          <Suspense fallback={<Spin style={{ margin: 'auto', display: 'block', paddingTop: '40vh' }} />}>
            <ChatView />
          </Suspense>
        </main>

        <aside
          style={{
            gridArea: 'rightpanel',
            borderLeft: rightPanelOpen ? '1px solid var(--border)' : 'none',
            overflow: 'hidden',
            transition: 'width 0.2s ease',
          }}
        >
          {rightPanelOpen && (
            <Suspense fallback={<Spin style={{ margin: 'auto', display: 'block', paddingTop: '40vh' }} />}>
              <RightPanel />
            </Suspense>
          )}
        </aside>

        <footer style={{ gridArea: 'statusbar', borderTop: '1px solid var(--border)' }}>
          <StatusBar />
        </footer>
      </div>
    </ConfigProvider>
  );
}
