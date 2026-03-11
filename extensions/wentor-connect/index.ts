/**
 * Wentor Connect Plugin — PLACEHOLDER
 *
 * Future scope: Wentor platform integration (account sync, skills sync, telemetry).
 * No spec document in current plan — deferred to post-MVP.
 */
import type { OpenClawPluginDefinition } from 'openclaw/plugin-sdk';

const plugin: OpenClawPluginDefinition = {
  id: 'wentor-connect',
  name: 'Wentor Connect',
  description: 'Wentor platform integration (placeholder — not yet implemented)',
  version: '0.1.0',

  register(api) {
    api.logger.info('Wentor Connect loaded (placeholder — no functionality yet)');
  },
};

export default plugin;
