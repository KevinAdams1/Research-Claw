import type {
  ConnectionState,
  EventFrame,
  GatewayErrorInfo,
  HelloOk,
  RequestFrame,
  ResponseFrame,
} from './types';
import { PROTOCOL_VERSION } from './types';
import { ReconnectScheduler } from './reconnect';

export class GatewayRequestError extends Error {
  code: string;
  details?: unknown;

  constructor(info: GatewayErrorInfo) {
    super(info.message);
    this.name = 'GatewayRequestError';
    this.code = info.code;
    this.details = info.details;
  }
}

export interface GatewayClientOptions {
  url: string;
  token?: string;
  clientName?: string;
  clientVersion?: string;
  platform?: string;
  onHello?: (hello: HelloOk) => void;
  onEvent?: (event: EventFrame) => void;
  onClose?: (code: number, reason: string) => void;
  onStateChange?: (state: ConnectionState) => void;
  onGap?: (expected: number, actual: number) => void;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const REQUEST_TIMEOUT_MS = 30_000;
const NON_RECOVERABLE_CODES = new Set(['UNAUTHORIZED', 'FORBIDDEN']);

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private eventHandlers = new Map<string, Set<(payload: unknown) => void>>();
  private lastSeq = 0;
  private state: ConnectionState = 'disconnected';
  private opts: GatewayClientOptions;
  private reconnector = new ReconnectScheduler();
  private intentionalClose = false;

  constructor(opts: GatewayClientOptions) {
    this.opts = opts;
  }

  get connectionState(): ConnectionState {
    return this.state;
  }

  get isConnected(): boolean {
    return this.state === 'connected';
  }

  connect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.intentionalClose = false;
    this.setState('connecting');

    const ws = new WebSocket(this.opts.url);
    this.ws = ws;

    ws.onopen = () => {
      // Wait for connect.challenge event from server
    };

    ws.onmessage = (ev: MessageEvent) => {
      let frame: ResponseFrame | EventFrame;
      try {
        frame = JSON.parse(ev.data as string);
      } catch {
        return;
      }

      if (frame.type === 'event') {
        if (frame.event === 'connect.challenge') {
          this.handleChallenge(frame);
        } else {
          this.handleEvent(frame);
        }
      } else if (frame.type === 'res') {
        this.handleResponse(frame);
      }
    };

    ws.onclose = (ev: CloseEvent) => {
      const wasConnected = this.state === 'connected';
      this.opts.onClose?.(ev.code, ev.reason);

      // Reject all pending requests
      for (const [id, entry] of this.pending) {
        clearTimeout(entry.timer);
        entry.reject(new Error('Connection closed'));
        this.pending.delete(id);
      }

      if (this.intentionalClose || ev.code === 1000 || ev.code === 1001) {
        this.setState('disconnected');
        return;
      }

      // Schedule reconnect
      if (wasConnected || this.state === 'reconnecting') {
        this.setState('reconnecting');
        this.reconnector.schedule(() => this.connect());
      } else {
        this.setState('disconnected');
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.reconnector.cancel();
    this.ws?.close(1000, 'client disconnect');
    this.ws = null;
    this.setState('disconnected');
  }

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.state !== 'connected') {
      throw new Error('Not connected to gateway');
    }

    const id = crypto.randomUUID();
    const frame: RequestFrame = { type: 'req', id, method };
    if (params !== undefined) {
      frame.params = params;
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timeout: ${method} (${REQUEST_TIMEOUT_MS}ms)`));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      this.ws!.send(JSON.stringify(frame));
    });
  }

  subscribe(event: string, handler: (payload: unknown) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  private handleChallenge(frame: EventFrame): void {
    this.setState('authenticating');
    const payload = frame.payload as { nonce?: string } | undefined;
    const nonce = payload?.nonce;

    const id = crypto.randomUUID();
    const connectFrame: RequestFrame = {
      type: 'req',
      id,
      method: 'connect',
      params: {
        protocol: PROTOCOL_VERSION,
        auth: {
          method: 'loopback',
          ...(nonce ? { nonce } : {}),
        },
        client: {
          name: this.opts.clientName ?? 'research-claw-dashboard',
          version: this.opts.clientVersion ?? '0.1.0',
        },
        platform: this.opts.platform ?? 'browser',
        mode: 'local',
      },
    };

    const timer = setTimeout(() => {
      this.pending.delete(id);
      this.ws?.close();
      this.setState('disconnected');
    }, REQUEST_TIMEOUT_MS);

    this.pending.set(id, {
      resolve: (payload) => {
        const hello = payload as HelloOk;
        this.setState('connected');
        this.reconnector.reset();
        this.lastSeq = 0;
        this.opts.onHello?.(hello);
      },
      reject: (err) => {
        if (err instanceof GatewayRequestError && NON_RECOVERABLE_CODES.has(err.code)) {
          this.reconnector.cancel();
          this.ws?.close();
          this.setState('disconnected');
        }
      },
      timer,
    });

    this.ws!.send(JSON.stringify(connectFrame));
  }

  private handleResponse(frame: ResponseFrame): void {
    const entry = this.pending.get(frame.id);
    if (!entry) return;

    clearTimeout(entry.timer);
    this.pending.delete(frame.id);

    if (frame.ok) {
      entry.resolve(frame.payload);
    } else {
      entry.reject(new GatewayRequestError(frame.error ?? { code: 'UNKNOWN', message: 'Unknown error' }));
    }
  }

  private handleEvent(frame: EventFrame): void {
    if (frame.seq !== undefined) {
      if (this.lastSeq > 0 && frame.seq > this.lastSeq + 1) {
        this.opts.onGap?.(this.lastSeq + 1, frame.seq);
      }
      this.lastSeq = frame.seq;
    }

    const handlers = this.eventHandlers.get(frame.event);
    if (handlers) {
      for (const h of handlers) {
        h(frame.payload);
      }
    }
    this.opts.onEvent?.(frame);
  }

  private setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.opts.onStateChange?.(state);
  }
}
