/**
 * Gateway WS RPC Client Tests
 *
 * Phase 4 work item — do NOT implement until Phase 4 (unit test track).
 * These stubs define the test surface for the gateway WS RPC client.
 *
 * Areas to cover:
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
