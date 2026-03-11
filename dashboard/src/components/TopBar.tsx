import React from 'react';
import { Badge, Button, Popover, Space, Switch, List, Typography } from 'antd';
import {
  BellOutlined,
  BulbOutlined,
  BulbFilled,
  UserOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useConfigStore } from '../stores/config';
import { useUiStore } from '../stores/ui';
import type { AgentStatus } from '../stores/ui';

const { Text } = Typography;

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'var(--success)',
  thinking: 'var(--warning)',
  tool_running: 'var(--warning)',
  streaming: 'var(--accent-secondary)',
  error: 'var(--accent-primary)',
  disconnected: 'var(--text-tertiary)',
};

const PULSE_STATES = new Set<AgentStatus>(['thinking', 'tool_running', 'streaming']);

function AgentStatusDot({ status }: { status: AgentStatus }) {
  const { t } = useTranslation();
  const color = STATUS_COLORS[status];
  const pulse = PULSE_STATES.has(status);

  return (
    <div
      title={t(`agent.${status === 'tool_running' ? 'toolRunning' : status}`)}
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: color,
        animation: pulse ? 'pulse 1.5s ease-in-out infinite' : undefined,
        flexShrink: 0,
      }}
    />
  );
}

function NotificationPanel() {
  const { t } = useTranslation();
  const notifications = useUiStore((s) => s.notifications);
  const markAllRead = useUiStore((s) => s.markAllNotificationsRead);

  if (notifications.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: 'center', minWidth: 240 }}>
        <Text type="secondary">{t('topbar.noNotifications')}</Text>
      </div>
    );
  }

  return (
    <div style={{ minWidth: 280, maxHeight: 360, overflow: 'auto' }}>
      <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>{t('topbar.notifications')}</Text>
        <Button type="link" size="small" onClick={markAllRead}>
          {t('topbar.markAllRead')}
        </Button>
      </div>
      <List
        size="small"
        dataSource={notifications.slice(0, 20)}
        renderItem={(item) => (
          <List.Item
            style={{
              padding: '8px 12px',
              background: item.read ? 'transparent' : 'var(--surface-active)',
            }}
          >
            <List.Item.Meta
              title={<Text style={{ fontSize: 13 }}>{item.title}</Text>}
              description={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.body}
                </Text>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}

export default function TopBar() {
  const { t } = useTranslation();
  const theme = useConfigStore((s) => s.theme);
  const setTheme = useConfigStore((s) => s.setTheme);
  const unreadCount = useUiStore((s) => s.unreadCount);
  const agentStatus = useUiStore((s) => s.agentStatus);

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
            color: 'var(--accent-primary)',
          }}
        >
          {t('app.name')}
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right actions */}
      <Space size={12} align="center">
        {/* Notification bell */}
        <Popover
          content={<NotificationPanel />}
          trigger="click"
          placement="bottomRight"
        >
          <Badge count={unreadCount} size="small" offset={[-2, 2]} overflowCount={99}>
            <Button
              type="text"
              icon={<BellOutlined />}
              title={t('topbar.notifications')}
              style={{ color: 'var(--text-secondary)' }}
            />
          </Badge>
        </Popover>

        {/* Agent status dot */}
        <AgentStatusDot status={agentStatus} />

        {/* Theme toggle */}
        <Switch
          checked={theme === 'light'}
          onChange={handleThemeToggle}
          checkedChildren={<BulbFilled />}
          unCheckedChildren={<BulbOutlined />}
          title={t('topbar.themeToggle')}
          size="small"
        />

        {/* Avatar */}
        <Button
          type="text"
          icon={<UserOutlined />}
          shape="circle"
          size="small"
          title={t('topbar.profile')}
          style={{ color: 'var(--text-secondary)' }}
        />
      </Space>
    </div>
  );
}
