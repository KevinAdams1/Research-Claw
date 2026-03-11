/**
 * Gateway WS RPC v3 frame types.
 * Based on OpenClaw protocol-schemas.ts (PROTOCOL_VERSION = 3).
 */

export const PROTOCOL_VERSION = 3;

// --- Frame Types ---

export interface RequestFrame {
  type: 'req';
  id: string;
  method: string;
  params?: unknown;
}

export interface ResponseFrame {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: GatewayErrorInfo;
}

export interface EventFrame {
  type: 'event';
  event: string;
  payload?: unknown;
  seq?: number;
  stateVersion?: { presence: number; health: number };
}

export type GatewayFrame = ResponseFrame | EventFrame;

export interface GatewayErrorInfo {
  code: string;
  message: string;
  details?: unknown;
}

// --- Hello/Auth ---

export interface HelloOk {
  type: 'hello-ok';
  protocol: number;
  server?: { version?: string; connId?: string };
  features?: { methods?: string[]; events?: string[] };
  snapshot?: unknown;
  auth?: { deviceToken?: string; role?: string; scopes?: string[]; issuedAtMs?: number };
  policy?: { tickIntervalMs?: number };
}

// --- Chat Types ---

export interface ChatStreamEvent {
  runId: string;
  sessionKey: string;
  state: 'delta' | 'final' | 'aborted' | 'error';
  message?: ChatMessage;
  errorMessage?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content?: Array<{ type: string; text?: string; source?: unknown }>;
  text?: string;
  timestamp?: number;
}

export interface ChatAttachment {
  dataUrl: string;
  mimeType: string;
}

// --- Bootstrap Config ---

export interface BootstrapConfig {
  basePath: string;
  assistantName: string;
  assistantAvatar: string | null;
  assistantAgentId: string;
  serverVersion: string;
}

// --- Connection State ---

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'reconnecting';
