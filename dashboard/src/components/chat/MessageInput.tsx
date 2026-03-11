import React, { useState, useRef, useCallback } from 'react';
import { Button, Tooltip } from 'antd';
import { SendOutlined, PauseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../../stores/chat';
import { useGatewayStore } from '../../stores/gateway';

export default function MessageInput() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const send = useChatStore((s) => s.send);
  const abort = useChatStore((s) => s.abort);
  const sending = useChatStore((s) => s.sending);
  const streaming = useChatStore((s) => s.streaming);
  const connState = useGatewayStore((s) => s.state);

  const isConnected = connState === 'connected';
  const canSend = text.trim().length > 0 && isConnected && !sending;

  const handleSend = useCallback(() => {
    const message = text.trim();
    if (!message || !isConnected || sending) return;
    setText('');
    send(message);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, isConnected, sending, send]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div
      style={{
        padding: '12px 24px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          background: 'var(--surface-hover)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 12px',
          transition: 'border-color 0.15s ease',
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder')}
          disabled={!isConnected || sending}
          rows={1}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: 14,
            lineHeight: 1.5,
            resize: 'none',
            fontFamily: 'inherit',
            minHeight: 22,
            maxHeight: 160,
          }}
        />

        {streaming ? (
          <Tooltip title={t('chat.abort')}>
            <Button
              type="text"
              icon={<PauseOutlined />}
              onClick={abort}
              style={{
                color: 'var(--accent-primary)',
                flexShrink: 0,
              }}
            />
          </Tooltip>
        ) : (
          <Tooltip title={t('chat.send')}>
            <Button
              type="text"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!canSend}
              style={{
                color: canSend ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                flexShrink: 0,
              }}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
}
