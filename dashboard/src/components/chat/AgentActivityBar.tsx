import { useTranslation } from 'react-i18next';
import { useToolStreamStore } from '../../stores/tool-stream';
import { ToolOutlined } from '@ant-design/icons';

export default function AgentActivityBar() {
  const { t } = useTranslation();
  const bgActivity = useToolStreamStore((s) => s.bgActivity);

  if (!bgActivity) return null;

  const statusKey = bgActivity.status === 'tool_running'
    ? 'agent.toolRunning'
    : bgActivity.status === 'streaming'
      ? 'agent.streaming'
      : 'agent.thinking';

  return (
    <div
      style={{
        padding: '6px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(245, 158, 11, 0.06)',
        borderBottom: '1px solid rgba(245, 158, 11, 0.15)',
        fontSize: 12,
        fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
        color: 'var(--text-secondary)',
        minHeight: 32,
      }}
    >
      {/* Pulsing amber dot */}
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: '#F59E0B',
          animation: 'pulse 1.5s ease-in-out infinite',
          flexShrink: 0,
        }}
      />
      <span>{t('chat.bgWorking')}</span>
      <span style={{ color: 'var(--text-tertiary)' }}>{t(statusKey)}</span>
      {bgActivity.currentTool && (
        <>
          <ToolOutlined style={{ fontSize: 11, color: 'var(--text-tertiary)' }} />
          <span style={{ color: 'var(--text-tertiary)' }}>{bgActivity.currentTool}</span>
        </>
      )}
      <div style={{ flex: 1 }} />
      <button
        onClick={() => useToolStreamStore.getState().clearAll()}
        aria-label={t('chat.dismiss')}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          fontSize: 14,
          padding: '0 2px',
          lineHeight: 1,
        }}
      >
        &times;
      </button>
    </div>
  );
}
