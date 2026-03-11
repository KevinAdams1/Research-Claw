/**
 * Exponential backoff reconnection strategy.
 *
 * Pattern: 800ms initial → 15s cap, 1.7x multiplier.
 * Based on OpenClaw's GatewayBrowserClient reconnection logic.
 */

export interface ReconnectConfig {
  initialDelayMs?: number;
  maxDelayMs?: number;
  multiplier?: number;
}

const DEFAULTS: Required<ReconnectConfig> = {
  initialDelayMs: 800,
  maxDelayMs: 15_000,
  multiplier: 1.7,
};

export class ReconnectScheduler {
  private delay: number;
  private config: Required<ReconnectConfig>;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(config?: ReconnectConfig) {
    this.config = { ...DEFAULTS, ...config };
    this.delay = this.config.initialDelayMs;
  }

  schedule(fn: () => void): void {
    this.timer = setTimeout(() => {
      fn();
      this.delay = Math.min(this.delay * this.config.multiplier, this.config.maxDelayMs);
    }, this.delay);
  }

  reset(): void {
    this.delay = this.config.initialDelayMs;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
