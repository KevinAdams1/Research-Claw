import React, { useEffect, useRef } from 'react';
import { Typography, Spin } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../../stores/chat';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

const { Text } = Typography;

export default function ChatView() {
  const { t } = useTranslation();
  const messages = useChatStore((s) => s.messages);
  const streaming = useChatStore((s) => s.streaming);
  const streamText = useChatStore((s) => s.streamText);
  const sending = useChatStore((s) => s.sending);
  const lastError = useChatStore((s) => s.lastError);
  const clearError = useChatStore((s) => s.clearError);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, streamText]);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
      }}
    >
      {/* Message list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px 24px',
        }}
      >
        {messages.length === 0 && !streaming && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 12,
            }}
          >
            <MessageOutlined
              style={{ fontSize: 48, color: 'var(--text-tertiary)', opacity: 0.5 }}
            />
            <Text type="secondary">{t('chat.empty')}</Text>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {/* Streaming indicator */}
        {streaming && streamText && (
          <MessageBubble
            message={{ role: 'assistant', text: streamText, timestamp: Date.now() }}
            isStreaming
          />
        )}

        {/* Sending indicator */}
        {sending && (
          <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Spin size="small" />
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('chat.thinking')}
            </Text>
          </div>
        )}
      </div>

      {/* Error banner */}
      {lastError && (
        <div
          style={{
            padding: '8px 24px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderTop: '1px solid var(--error)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: 'var(--error)', fontSize: 13 }}>{lastError}</Text>
          <button
            onClick={clearError}
            aria-label={t('chat.dismiss')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--error)',
              cursor: 'pointer',
              fontSize: 16,
              padding: '0 4px',
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Input area */}
      <MessageInput />
    </div>
  );
}
