import React, { useState } from 'react';
import { Button, Input, Select, Typography, Space, Alert, Card } from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useConfigStore } from '../../stores/config';
import { GatewayClient } from '../../gateway/client';

const { Title, Text } = Typography;

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'custom', label: 'Custom' },
];

const PROVIDER_ENDPOINTS: Record<string, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com',
  openrouter: 'https://openrouter.ai/api',
  custom: '',
};

type TestStatus = 'idle' | 'testing' | 'success' | 'failed';

export default function SetupWizard() {
  const { t } = useTranslation();
  const completeSetup = useConfigStore((s) => s.completeSetup);

  const [provider, setProvider] = useState<string>('anthropic');
  const [endpoint, setEndpoint] = useState<string>(PROVIDER_ENDPOINTS.anthropic);
  const [apiKey, setApiKey] = useState<string>('');
  const [proxy, setProxy] = useState<string>('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState<string>('');

  const handleProviderChange = (value: string) => {
    setProvider(value);
    setEndpoint(PROVIDER_ENDPOINTS[value] ?? '');
    setTestStatus('idle');
  };

  const handleTest = async () => {
    setTestStatus('testing');
    setTestError('');

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          testClient?.disconnect();
          reject(new Error('Connection timeout'));
        }, 10_000);

        let testClient: GatewayClient | null = null;

        testClient = new GatewayClient({
          url: 'ws://127.0.0.1:18789',
          clientName: 'research-claw-dashboard',
          clientVersion: '0.1.0',
          onHello: async () => {
            try {
              // Handshake succeeded — call health RPC to verify gateway
              await testClient!.request('health');
              clearTimeout(timeout);
              setTestStatus('success');
              testClient!.disconnect();
              resolve();
            } catch (err) {
              clearTimeout(timeout);
              testClient!.disconnect();
              reject(err instanceof Error ? err : new Error('Health check failed'));
            }
          },
          onClose: (_code, reason) => {
            clearTimeout(timeout);
            reject(new Error(reason || 'Connection closed'));
          },
        });

        testClient.connect();
      });
    } catch (err) {
      setTestStatus('failed');
      setTestError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleStart = () => {
    completeSetup(apiKey, provider, endpoint, proxy || undefined);
  };

  const canStart = apiKey.trim().length > 0 && provider;

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--surface-hover)',
          border: '1px solid var(--border)',
        }}
        styles={{ body: { padding: 32 } }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <RocketOutlined style={{ fontSize: 48, color: 'var(--accent-primary)', marginBottom: 16 }} />
            <Title level={3} style={{ margin: 0 }}>
              {t('setup.title')}
            </Title>
            <Text type="secondary">{t('setup.subtitle')}</Text>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              {t('setup.provider')}
            </Text>
            <Select
              style={{ width: '100%' }}
              value={provider}
              onChange={handleProviderChange}
              options={PROVIDERS}
              placeholder={t('setup.providerPlaceholder')}
            />
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              {t('setup.endpoint')}
            </Text>
            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder={t('setup.endpointPlaceholder')}
            />
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              {t('setup.apiKey')}
            </Text>
            <Input.Password
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('setup.apiKeyPlaceholder')}
              prefix={<ApiOutlined />}
            />
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              {t('setup.proxy')}
            </Text>
            <Input
              value={proxy}
              onChange={(e) => setProxy(e.target.value)}
              placeholder={t('setup.proxyPlaceholder')}
            />
          </div>

          {testStatus === 'success' && (
            <Alert
              type="success"
              message={t('setup.testSuccess')}
              icon={<CheckCircleOutlined />}
              showIcon
            />
          )}

          {testStatus === 'failed' && (
            <Alert
              type="error"
              message={t('setup.testFailed', { error: testError })}
              icon={<CloseCircleOutlined />}
              showIcon
            />
          )}

          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button
              onClick={handleTest}
              loading={testStatus === 'testing'}
              icon={testStatus === 'testing' ? <LoadingOutlined /> : <ApiOutlined />}
            >
              {testStatus === 'testing' ? t('setup.testing') : t('setup.test')}
            </Button>

            <Button
              type="primary"
              onClick={handleStart}
              disabled={!canStart}
              icon={<RocketOutlined />}
            >
              {t('setup.start')}
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
}
