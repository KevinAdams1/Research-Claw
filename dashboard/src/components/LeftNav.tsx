import React from 'react';
import { Button, Tooltip, Typography } from 'antd';
import {
  BookOutlined,
  FolderOutlined,
  CheckSquareOutlined,
  RadarChartOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useUiStore, type PanelTab } from '../stores/ui';

const { Text } = Typography;

interface NavItem {
  key: PanelTab;
  icon: React.ReactNode;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'library', icon: <BookOutlined />, labelKey: 'nav.library' },
  { key: 'workspace', icon: <FolderOutlined />, labelKey: 'nav.workspace' },
  { key: 'tasks', icon: <CheckSquareOutlined />, labelKey: 'nav.tasks' },
  { key: 'radar', icon: <RadarChartOutlined />, labelKey: 'nav.radar' },
  { key: 'settings', icon: <SettingOutlined />, labelKey: 'nav.settings' },
];

export default function LeftNav() {
  const { t } = useTranslation();
  const collapsed = useUiStore((s) => s.leftNavCollapsed);
  const toggleLeftNav = useUiStore((s) => s.toggleLeftNav);
  const rightPanelTab = useUiStore((s) => s.rightPanelTab);
  const setRightPanelTab = useUiStore((s) => s.setRightPanelTab);
  const rightPanelOpen = useUiStore((s) => s.rightPanelOpen);
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel);

  const handleNavClick = (tab: PanelTab) => {
    if (rightPanelTab === tab && rightPanelOpen) {
      toggleRightPanel();
    } else {
      setRightPanelTab(tab);
    }
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        overflow: 'hidden',
      }}
    >
      {/* Project switcher */}
      <div
        style={{
          padding: collapsed ? '12px 8px' : '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {collapsed ? (
          <Tooltip title={t('nav.project.switch')} placement="right">
            <Button
              type="text"
              icon={<AppstoreOutlined />}
              style={{ width: '100%', color: 'var(--text-secondary)' }}
            />
          </Tooltip>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppstoreOutlined style={{ color: 'var(--accent-secondary)', fontSize: 16 }} />
            <Text
              ellipsis
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {t('nav.project.default')}
            </Text>
          </div>
        )}
      </div>

      {/* Function rail */}
      <div style={{ flex: 1, padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = rightPanelTab === item.key && rightPanelOpen;
          const btnStyle: React.CSSProperties = {
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '8px 0' : '8px 16px',
            height: 40,
            borderRadius: 0,
            color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
            background: isActive ? 'var(--surface-active)' : 'transparent',
            borderLeft: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
            transition: 'all 0.15s ease',
          };

          const button = (
            <Button
              key={item.key}
              type="text"
              icon={item.icon}
              onClick={() => handleNavClick(item.key)}
              style={btnStyle}
            >
              {!collapsed && (
                <span style={{ marginLeft: 8, fontSize: 13 }}>{t(item.labelKey)}</span>
              )}
            </Button>
          );

          return collapsed ? (
            <Tooltip key={item.key} title={t(item.labelKey)} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
      </div>

      {/* Collapse toggle */}
      <div
        style={{
          padding: '8px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-end',
        }}
      >
        <Tooltip title={collapsed ? t('nav.expand') : t('nav.collapse')} placement="right">
          <Button
            type="text"
            size="small"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleLeftNav}
            style={{ color: 'var(--text-tertiary)' }}
          />
        </Tooltip>
      </div>
    </div>
  );
}
