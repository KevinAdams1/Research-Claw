# Model & Provider Configuration Changelog

> Dedicated changelog tracking changes to the LLM provider/model naming system,
> the SetupWizard, SettingsPanel, and the config-patch data flow.
>
> Scope: `provider-presets.ts`, `config-patch.ts`, `SetupWizard.tsx`, `SettingsPanel.tsx`,
> `stores/config.ts`, and the `models.providers` / `agents.defaults` sections of `openclaw.json`.

---

## 2026-03-13 — Native Provider Key Alignment (v1)

### Context & Motivation

Research-Claw's dashboard previously used custom provider keys `rc` and `rc-vision`
(hardcoded in `config-patch.ts`) to wrap all LLM providers. This broke two critical
OpenClaw mechanisms:

1. **ProviderCapabilities** — `resolveProviderCapabilities(provider)` in OpenClaw uses
   the provider key to determine tool schema mode (e.g., `tool_use` for Anthropic,
   strict JSON for OpenAI), thinking signature handling, and other provider-specific
   behavior. Custom keys like `rc` fall through to `default` capabilities, losing all
   provider-specific optimizations.

2. **Automatic imageModel fallback** — `resolveImageModelConfigForTool()` in OpenClaw
   has explicit branches for `zai`, `openai`, `anthropic`, etc. to auto-select a
   vision-capable model when the primary model doesn't support images. With provider
   key `rc`, none of these branches matched, causing images to be silently dropped
   even when the underlying API supported them.

### Decision

Align the dashboard config system back to OpenClaw's native provider architecture:
- Use the exact provider keys OpenClaw recognizes (`zai`, `openai`, `anthropic`, etc.)
- Support separate text/vision models via OpenClaw's native `agents.defaults.imageModel`
- Preserve the existing wizard <-> panel <-> config.patch interaction UX

### Changes

#### `src/utils/provider-presets.ts` — Complete rewrite

**Before:** 7 custom presets (MiniMax, Zhipu, DeepSeek, OpenAI, Anthropic, OpenRouter, Custom)
with non-standard IDs (e.g., `zhipu` instead of `zai`).

**After:** 25 OpenClaw-native providers, organized in 4 tiers:
- Tier 1 (Major cloud): `anthropic`, `openai`, `google`
- Tier 2 (Chinese): `zai`, `moonshot`, `kimi-coding`, `minimax`, `volcengine`, `byteplus`, `qianfan`, `modelstudio`, `xiaomi`
- Tier 3 (International): `openrouter`, `mistral`, `xai`, `together`, `venice`, `nvidia`, `huggingface`, `synthetic`, `kilocode`
- Tier 4 (Self-hosted): `ollama`, `vllm`
- Custom (always last): `custom`

Each preset's `id` matches the key OpenClaw uses in `models.providers.*` and
`PROVIDER_CAPABILITIES`. Source references:
- `openclaw/src/agents/provider-capabilities.ts`
- `openclaw/src/agents/models-config.providers.static.ts`
- `openclaw/src/commands/auth-choice-options.ts`
- `openclaw/src/commands/onboard-auth.models.ts`

New exports:
- `detectPresetFromProvider(key, baseUrl?)` — exact ID match, then URL fallback
- `detectPresetFromUrl(baseUrl)` — retained as internal helper

#### `src/utils/config-patch.ts` — Rewritten core logic

**Removed:**
- `RC_PROVIDER = 'rc'` constant
- `RC_VISION_PROVIDER = 'rc-vision'` constant
- All logic referencing these two hardcoded names

**Changed interfaces:**

`ConfigPatchInput`:
- Added required `provider: string` — native provider key
- Added `visionEnabled?: boolean` — explicit opt-in for vision
- Added `visionProvider?: string` — native key for vision (may equal text provider)
- Removed implicit "use separate endpoint" detection based on URL comparison

`ExtractedConfig`:
- Added `provider: string` — detected native key from `model.primary`
- Added `visionProvider: string` — detected native key from `imageModel.primary`
- Replaced `useDifferentVisionEndpoint: boolean` with `visionEnabled: boolean`

**`buildConfigPatch()` behavior:**
- Provider entries use native keys: `models.providers.{nativeKey}` instead of `models.providers.rc`
- Same-provider vision (e.g., text=`zai/glm-5`, vision=`zai/glm-4.6v`): single provider entry, both models in `models` array
- Different-provider vision (e.g., text=`openai/gpt-4o`, vision=`zai/glm-4.6v`): two provider entries, each with its native key
- `agents.defaults.model.primary` = `"{nativeKey}/{modelId}"`
- `agents.defaults.imageModel.primary` = `"{visionNativeKey}/{visionModelId}"`

**`extractConfigFields()` behavior:**
- Parses provider key from `agents.defaults.model.primary` (first `/`-segment)
- Parses vision provider key from `agents.defaults.imageModel.primary`
- Looks up provider definitions from `models.providers` using these native keys
- `visionEnabled = true` when imageModel exists and differs from text model (either different provider or different model ID)

**Unchanged:** `isConfigValid()`, `hasModelConfigured()` — already provider-agnostic.

#### `src/components/setup/SetupWizard.tsx` — Updated

- Default provider state: `'zhipu'` -> `'zai'` (native key)
- All provider `<Select>` dropdowns: added `showSearch` + `filterOption` (searches both label and ID)
- Pre-fill logic: `detectPresetFromUrl(fields.baseUrl)` -> `detectPresetFromProvider(fields.provider, fields.baseUrl)` (exact key match first, URL fallback second)
- Vision section: baseUrl/apiKey fields hidden when `visionProvider === provider` (shared credentials)
- `buildConfigPatch()` call: passes `provider`, `visionProvider`, `visionEnabled`
- Import: `detectPresetFromUrl` -> `detectPresetFromProvider`

#### `src/components/panels/SettingsPanel.tsx` — Updated

Same changes as SetupWizard, adapted for SettingRow layout:
- Searchable provider dropdowns with `showSearch` + `filterOption`
- Pre-fill via `detectPresetFromProvider`
- Vision baseUrl/apiKey conditional on `visionSeparateProvider`
- `handleSave` dependency array updated to include `provider`, `visionSeparateProvider`

#### `src/utils/config-patch.test.ts` — Rewritten

- 35 tests rewritten to use native provider keys (`openai`, `zai`, `minimax`, `openrouter`)
- Removed all references to `RC_PROVIDER`, `RC_VISION_PROVIDER`, `useDifferentVisionEndpoint`
- New test cases added:
  - Same-provider vision (two models in one provider entry)
  - Vision disabled ignores vision fields
  - Vision apiKey fallback to text apiKey
  - Multi-segment model refs (OpenRouter `provider/org/model` format)
  - `imageModel === textModel` does not enable vision
  - Native `zai` provider validation

### Verification

- 35/35 config-patch tests pass
- 360/360 full test suite pass (29 files)
- 0 TypeScript errors (`tsc --noEmit`)
- Dashboard built to `dist/` (131KB main bundle, 41KB gzip)

### Known Limitations

1. **Stale `rc` provider in `config/openclaw.json`**: The existing config still has a
   `providers.rc` entry. `config.patch` is a deep merge and cannot delete keys. After
   the user re-saves via wizard/panel, new native-keyed entries are created, and model
   refs point to them. The old `rc` entry becomes dead config but is harmless.

2. **`custom` provider capabilities**: When a user selects "Custom / Other" as provider,
   the config key is `custom`. OpenClaw's `resolveProviderCapabilities('custom')` returns
   `default` capabilities. This matches the old `rc` behavior and is acceptable for
   unknown providers.

3. **Provider presets are a snapshot**: The 25 provider presets and their model lists are
   static in the dashboard source. They may drift as OpenClaw adds providers or updates
   model catalogs. Users can always type custom model IDs in the AutoComplete fields.

---

## Planned

- [ ] Clean up stale `rc` provider from `config/openclaw.json` (requires `config.set` with full raw config, or manual edit)
- [ ] Add provider-specific API protocol selector (currently only shown for `custom`; other providers locked to preset)
- [ ] Dynamic model discovery from gateway (probe available models per provider)
