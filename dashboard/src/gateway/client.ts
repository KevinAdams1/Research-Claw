/**
 * Gateway WS RPC v3 Client for Research-Claw Dashboard.
 *
 * Based on OpenClaw's GatewayBrowserClient pattern (ui/src/ui/gateway.ts).
 * Handles connection, auth handshake, request/response correlation, and event routing.
 *
 * TODO: Full implementation in Phase 4 (03e-dashboard-ui.md)
 */
import type {
  ConnectionState,
  GatewayFrame,
  HelloOk,
  RequestFrame,
  ResponseFrame,
  EventFrame,
  GatewayErrorInfo,
} from './types';

export interface GatewayClientOptions {
  url: string;
  token?: string;
  clientName?: string;
  clientVersion?: string;
  onHello?: (hello: HelloOk) => void;
  onEvent?: (event: EventFrame) => void;
  onClose?: (code: number, reason: string) => void;
  onStateChange?: (state: ConnectionState) => void;
}

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private lastSeq = 0;
  private state: ConnectionState = 'disconnected';
  private opts: GatewayClientOptions;

  constructor(opts: GatewayClientOptions) {
    this.opts = opts;
  }

  get connectionState(): ConnectionState {
    return this.state;
  }

  connect(): void {
    // TODO: Implement WS connection + challenge/connect handshake
    // See docs/modules/03e-dashboard-ui.md Section 2 for full spec
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.setState('disconnected');
  }

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    // TODO: Implement request/response with UUID correlation
    // See docs/modules/03e-dashboard-ui.md Section 2
    throw new Error('Not implemented');
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.opts.onStateChange?.(state);
  }
}
