/**
 * Build & parse OpenClaw config patches for the dashboard.
 *
 * Uses OpenClaw's native provider keys (e.g. 'zai', 'openai', 'anthropic')
 * so that ProviderCapabilities and imageModel fallback logic work correctly.
 */

import { getPreset } from './provider-presets';

/** Sentinel value OpenClaw uses to redact secrets in resolved config */
export const REDACTED_SENTINEL = '__OPENCLAW_REDACTED__';

export interface ConfigPatchInput {
  /** OpenClaw native provider key (e.g. 'zai', 'openai', 'anthropic') */
  provider: string;
  baseUrl: string;
  /** API protocol: 'openai-completions' | 'anthropic-messages' | etc. */
  api?: string;
  /** Omit or empty to preserve existing key via config.patch deep merge */
  apiKey?: string;
  textModel: string;
  visionEnabled?: boolean;
  /** Native provider key for vision (may equal text provider) */
  visionProvider?: string;
  visionModel?: string;
  /** When vision uses a different provider, its baseUrl */
  visionBaseUrl?: string;
  visionApiKey?: string;
  /** API protocol for the vision provider */
  visionApi?: string;
  /** undefined = don't touch env, "" = clear proxy, "http://..." = set proxy */
  proxyUrl?: string;
}

export interface ExtractedConfig {
  /** Detected native provider key */
  provider: string;
  baseUrl: string;
  api: string;
  apiKey: string;
  /** True when the gateway has an API key configured (even if redacted) */
  apiKeyConfigured: boolean;
  textModel: string;
  visionEnabled: boolean;
  visionProvider: string;
  visionModel: string;
  visionBaseUrl: string;
  visionApiKey: string;
  /** True when the gateway has a vision API key configured (even if redacted) */
  visionApiKeyConfigured: boolean;
  visionApi: string;
  proxyUrl: string;
}

function cleanUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
}

function makeModelDef(id: string, input: string[]) {
  return { id, name: id, input, contextWindow: 128000, maxTokens: 65536 };
}

/**
 * Resolve a model's input capabilities from the provider preset.
 * Returns the preset's `input` array if found, otherwise defaults to
 * ['text', 'image'] (optimistic — assume unknown models are multimodal).
 */
function resolveModelInput(provider: string, modelId: string): string[] {
  const preset = getPreset(provider);
  const modelDef = preset.models.find((m) => m.id === modelId);
  return modelDef?.input ?? ['text', 'image'];
}

/**
 * Build a config.patch payload using native OpenClaw provider keys.
 */
export function buildConfigPatch(input: ConfigPatchInput): Record<string, unknown> {
  const providerKey = input.provider;
  const baseUrl = cleanUrl(input.baseUrl);
  const apiType = input.api || 'openai-completions';

  const hasVision = !!input.visionEnabled && !!input.visionModel;
  const visionProviderKey = input.visionProvider || providerKey;
  const useSeparateProvider = hasVision && visionProviderKey !== providerKey;

  // --- Text provider entry ---
  // Use preset's actual model capabilities for `input` array.
  // OpenClaw checks model.input.includes("image") to decide whether to inject
  // images into the conversation context — text-only models must NOT be marked
  // as image-capable, otherwise the provider API rejects with 400.
  const textModels = [makeModelDef(input.textModel, resolveModelInput(providerKey, input.textModel))];

  // Same provider, different vision model → add to same provider entry
  if (hasVision && !useSeparateProvider && input.visionModel !== input.textModel) {
    textModels.push(makeModelDef(input.visionModel!, resolveModelInput(providerKey, input.visionModel!)));
  }

  const textProvider: Record<string, unknown> = {
    baseUrl,
    api: apiType,
    models: textModels,
  };
  if (input.apiKey) {
    textProvider.apiKey = input.apiKey;
  }

  const providers: Record<string, unknown> = {
    [providerKey]: textProvider,
  };

  // --- Vision provider entry (only when using a different provider) ---
  if (useSeparateProvider) {
    const visionEntry: Record<string, unknown> = {
      baseUrl: cleanUrl(input.visionBaseUrl || input.baseUrl),
      api: input.visionApi || apiType,
      models: [makeModelDef(input.visionModel!, resolveModelInput(visionProviderKey, input.visionModel!))],
    };
    if (input.visionApiKey || input.apiKey) {
      visionEntry.apiKey = input.visionApiKey || input.apiKey;
    }
    providers[visionProviderKey] = visionEntry;
  }

  // --- Agent model refs ---
  const visionRef = hasVision
    ? `${visionProviderKey}/${input.visionModel}`
    : `${providerKey}/${input.textModel}`;

  const defaults: Record<string, unknown> = {
    model: { primary: `${providerKey}/${input.textModel}` },
    imageModel: { primary: visionRef },
  };

  // --- Patch ---
  const patch: Record<string, unknown> = {
    agents: { defaults },
    models: { providers },
  };

  if (input.proxyUrl !== undefined) {
    patch.env = {
      HTTP_PROXY: input.proxyUrl,
      HTTPS_PROXY: input.proxyUrl,
    };
  }

  return patch;
}

/**
 * Extract user-facing fields from an OpenClaw gateway config snapshot.
 */
export function extractConfigFields(
  config: Record<string, unknown> | null,
): ExtractedConfig {
  const empty: ExtractedConfig = {
    provider: 'custom',
    baseUrl: '',
    api: 'openai-completions',
    apiKey: '',
    apiKeyConfigured: false,
    textModel: '',
    visionEnabled: false,
    visionProvider: 'custom',
    visionModel: '',
    visionBaseUrl: '',
    visionApiKey: '',
    visionApiKeyConfigured: false,
    visionApi: 'openai-completions',
    proxyUrl: '',
  };
  if (!config) return empty;

  // --- Model refs ---
  const agents = config.agents as Record<string, unknown> | undefined;
  const defaults = agents?.defaults as Record<string, unknown> | undefined;
  const modelDef = defaults?.model as { primary?: string } | undefined;
  const imageModelDef = defaults?.imageModel as { primary?: string } | undefined;

  const primary = modelDef?.primary ?? '';
  const imagePrimary = imageModelDef?.primary ?? '';

  const providerOf = (ref: string) =>
    ref.includes('/') ? ref.split('/')[0] : '';
  const modelOf = (ref: string) =>
    ref.includes('/') ? ref.split('/').slice(1).join('/') : ref;

  const textProviderKey = providerOf(primary) || 'custom';
  const textModelId = modelOf(primary);

  const visionProviderKey = providerOf(imagePrimary) || textProviderKey;
  const visionModelId = modelOf(imagePrimary);

  // Vision is enabled when imageModel exists and differs from text model
  const visionEnabled = !!visionModelId &&
    (visionProviderKey !== textProviderKey || visionModelId !== textModelId);

  // --- Providers ---
  const providers = (config.models as Record<string, unknown> | undefined)
    ?.providers as Record<string, Record<string, unknown>> | undefined;

  const textProviderDef = providers?.[textProviderKey];
  const visionProviderDef = visionProviderKey !== textProviderKey
    ? providers?.[visionProviderKey]
    : undefined;

  // --- Proxy ---
  const env = config.env as Record<string, string> | undefined;
  const proxyUrl = env?.HTTP_PROXY || env?.HTTPS_PROXY || '';

  const deRedact = (v: unknown): string => {
    const s = (v as string) ?? '';
    return s === REDACTED_SENTINEL ? '' : s;
  };

  const apiKeyRaw = textProviderDef?.apiKey;
  const visionApiKeyRaw = visionProviderDef?.apiKey;

  return {
    provider: textProviderKey,
    baseUrl: (textProviderDef?.baseUrl as string) ?? '',
    api: (textProviderDef?.api as string) ?? 'openai-completions',
    apiKey: deRedact(apiKeyRaw),
    apiKeyConfigured: typeof apiKeyRaw === 'string' && apiKeyRaw.length > 0,
    textModel: textModelId,
    visionEnabled,
    visionProvider: visionProviderKey,
    visionModel: visionEnabled ? visionModelId : '',
    visionBaseUrl: visionEnabled
      ? (visionProviderDef?.baseUrl as string) ?? (textProviderDef?.baseUrl as string) ?? ''
      : '',
    visionApiKey: visionProviderDef ? deRedact(visionApiKeyRaw) : '',
    visionApiKeyConfigured: typeof visionApiKeyRaw === 'string' && visionApiKeyRaw.length > 0,
    visionApi: (visionProviderDef?.api as string) ?? (textProviderDef?.api as string) ?? 'openai-completions',
    proxyUrl,
  };
}

/**
 * Check if a gateway config has a valid model + matching provider.
 * Strict validation: requires both model ref AND a matching provider entry.
 */
export function isConfigValid(config: Record<string, unknown> | null): boolean {
  if (!config) return false;

  const agents = config.agents as Record<string, unknown> | undefined;
  const defaults = agents?.defaults as Record<string, unknown> | undefined;
  const modelDef = defaults?.model as { primary?: string } | undefined;
  const primary = modelDef?.primary ?? '';
  if (!primary) return false;

  const providerKey = primary.includes('/') ? primary.split('/')[0] : '';
  if (!providerKey) return false;

  const providers = (config.models as Record<string, unknown> | undefined)
    ?.providers as Record<string, Record<string, unknown>> | undefined;
  return !!providers?.[providerKey];
}

/**
 * Relaxed config check: only verifies that a model reference exists.
 * Used as a fallback when the gateway is running (hello-ok received)
 * but strict validation fails due to resolved config structure differences.
 */
export function hasModelConfigured(config: Record<string, unknown> | null): boolean {
  if (!config) return false;
  const agents = config.agents as Record<string, unknown> | undefined;
  const defaults = agents?.defaults as Record<string, unknown> | undefined;
  const modelDef = defaults?.model as { primary?: string } | undefined;
  const primary = modelDef?.primary ?? '';
  return primary.length > 0 && primary.includes('/');
}
