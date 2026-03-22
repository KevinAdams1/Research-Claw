/**
 * Device auth token lifecycle management.
 *
 * Aligned with OC ui/src/ui/device-auth.ts — caches device tokens in
 * localStorage so the dashboard can auto-reconnect after gateway restarts
 * without requiring the user to refresh the page.
 *
 * Storage format:
 *   Key: "rc.device.auth.v1"
 *   Value: { version: 1, deviceId, tokens: { [role]: { token, scopes, issuedAtMs } } }
 */

const STORAGE_KEY = 'rc.device.auth.v1';

export interface DeviceAuthEntry {
  token: string;
  scopes: string[];
  issuedAtMs: number;
}

interface DeviceAuthStore {
  version: 1;
  deviceId: string;
  tokens: Record<string, DeviceAuthEntry>;
}

function readStore(): DeviceAuthStore | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeviceAuthStore;
    if (!parsed || parsed.version !== 1) return null;
    if (!parsed.deviceId || typeof parsed.deviceId !== 'string') return null;
    if (!parsed.tokens || typeof parsed.tokens !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStore(store: DeviceAuthStore): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // best-effort — localStorage may be full
  }
}

export function loadDeviceAuthToken(params: {
  deviceId: string;
  role: string;
}): DeviceAuthEntry | null {
  const store = readStore();
  if (!store || store.deviceId !== params.deviceId) return null;
  return store.tokens[params.role] ?? null;
}

export function storeDeviceAuthToken(params: {
  deviceId: string;
  role: string;
  token: string;
  scopes?: string[];
}): void {
  let store = readStore();
  if (!store || store.deviceId !== params.deviceId) {
    store = { version: 1, deviceId: params.deviceId, tokens: {} };
  }
  store.tokens[params.role] = {
    token: params.token,
    scopes: params.scopes ?? [],
    issuedAtMs: Date.now(),
  };
  writeStore(store);
}

export function clearDeviceAuthToken(params: {
  deviceId: string;
  role: string;
}): void {
  const store = readStore();
  if (!store || store.deviceId !== params.deviceId) return;
  delete store.tokens[params.role];
  writeStore(store);
}
