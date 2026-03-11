import { create } from 'zustand';
import i18n from '../i18n';

interface ConfigState {
  theme: 'dark' | 'light';
  locale: 'en' | 'zh-CN';
  model: string | null;
  provider: string | null;
  endpoint: string | null;
  apiKey: string | null;
  proxyUrl: string | null;
  setupComplete: boolean;

  setTheme: (t: 'dark' | 'light') => void;
  setLocale: (l: 'en' | 'zh-CN') => void;
  setModel: (m: string) => void;
  loadConfig: () => void;
  completeSetup: (apiKey: string, provider: string, endpoint: string, proxy?: string) => void;
}

function loadFromStorage(): Partial<ConfigState> {
  try {
    const theme = (localStorage.getItem('rc-theme') as 'dark' | 'light') ?? 'dark';
    const locale = (localStorage.getItem('rc-locale') as 'en' | 'zh-CN') ?? 'en';
    const setupComplete = localStorage.getItem('rc-setup-complete') === 'true';
    const provider = localStorage.getItem('rc-provider');
    const endpoint = localStorage.getItem('rc-endpoint');
    const apiKey = localStorage.getItem('rc-api-key');
    const proxyUrl = localStorage.getItem('rc-proxy');
    const model = localStorage.getItem('rc-model');
    return {
      theme,
      locale,
      setupComplete,
      provider,
      endpoint,
      apiKey,
      proxyUrl,
      model,
    };
  } catch {
    return {};
  }
}

export const useConfigStore = create<ConfigState>()((set) => {
  const persisted = loadFromStorage();

  return {
    theme: persisted.theme ?? 'dark',
    locale: persisted.locale ?? 'en',
    model: null,
    provider: persisted.provider ?? null,
    endpoint: persisted.endpoint ?? null,
    apiKey: persisted.apiKey ?? null,
    proxyUrl: persisted.proxyUrl ?? null,
    setupComplete: persisted.setupComplete ?? false,

    setTheme: (t: 'dark' | 'light') => {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('rc-theme', t);
      set({ theme: t });
    },

    setLocale: (l: 'en' | 'zh-CN') => {
      i18n.changeLanguage(l);
      localStorage.setItem('rc-locale', l);
      set({ locale: l });
    },

    setModel: (m: string) => {
      localStorage.setItem('rc-model', m);
      set({ model: m });
    },

    loadConfig: () => {
      const data = loadFromStorage();
      if (data.theme) {
        document.documentElement.setAttribute('data-theme', data.theme);
      }
      set(data);
    },

    completeSetup: (apiKey: string, provider: string, endpoint: string, proxy?: string) => {
      localStorage.setItem('rc-api-key', apiKey);
      localStorage.setItem('rc-provider', provider);
      localStorage.setItem('rc-endpoint', endpoint);
      localStorage.setItem('rc-setup-complete', 'true');
      if (proxy) {
        localStorage.setItem('rc-proxy', proxy);
      }
      set({
        apiKey,
        provider,
        endpoint,
        proxyUrl: proxy ?? null,
        setupComplete: true,
      });
    },
  };
});
