import React from 'react';
import { Typography } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

export default function WorkspacePanel() {
  const { t } = useTranslation();

  return (
    <div style={{ padding: 16, textAlign: 'center', paddingTop: 40 }}>
      <FolderOutlined style={{ fontSize: 32, color: 'var(--text-tertiary)', opacity: 0.5 }} />
      <div style={{ marginTop: 12 }}>
        <Text type="secondary">{t('workspace.title')}</Text>
      </div>
      <div style={{ marginTop: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('panel.awaitingPlugin')}
        </Text>
      </div>
    </div>
  );
}
