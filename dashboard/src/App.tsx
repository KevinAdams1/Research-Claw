import React from 'react';
import { ConfigProvider, theme } from 'antd';

/**
 * Research-Claw Dashboard — 3-column shell
 * Left: LeftNav (project switcher + function rail)
 * Center: ChatView (main interaction)
 * Right: RightPanel (tabbed panels)
 */
export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#EF4444',
          colorInfo: '#3B82F6',
          borderRadius: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
      }}
    >
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* TopBar */}
        <header style={{ height: 48, borderBottom: '1px solid var(--border)' }}>
          {/* TODO: TopBar component */}
        </header>

        {/* Main 3-column layout */}
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Nav — 240px */}
          <aside style={{ width: 240, borderRight: '1px solid var(--border)' }}>
            {/* TODO: LeftNav component */}
          </aside>

          {/* Center Chat — flex */}
          <section style={{ flex: 1 }}>
            {/* TODO: ChatView component */}
          </section>

          {/* Right Panel — 320-480px, collapsible */}
          <aside style={{ width: 360, borderLeft: '1px solid var(--border)' }}>
            {/* TODO: RightPanel component */}
          </aside>
        </main>

        {/* Status Bar */}
        <footer style={{ height: 28, borderTop: '1px solid var(--border)' }}>
          {/* TODO: StatusBar component */}
        </footer>
      </div>
    </ConfigProvider>
  );
}
