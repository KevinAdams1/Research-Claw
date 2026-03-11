/**
 * Gateway WS RPC Client Tests
 *
 * TODO: Implement after dashboard client (Phase 4)
 * - Connection/reconnection behavior
 * - Request/response correlation
 * - Event subscription
 * - Auth handshake
 */
import { describe, it, expect } from 'vitest';

describe('GatewayClient', () => {
  it.todo('connects to gateway WebSocket');
  it.todo('handles challenge/connect handshake');
  it.todo('correlates request/response by ID');
  it.todo('routes events to subscribers');
  it.todo('reconnects with exponential backoff');
  it.todo('stops reconnecting on non-recoverable auth errors');
});
