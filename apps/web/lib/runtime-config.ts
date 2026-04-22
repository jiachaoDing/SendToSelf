const defaultAppOrigin = 'http://localhost:3000';

export type BrowserRuntimeConfig = {
  appOrigin: string;
};

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: Partial<BrowserRuntimeConfig>;
  }
}

function normalizeOrigin(value: string) {
  return value.replace(/\/$/, '');
}

export function readBrowserRuntimeConfig(): BrowserRuntimeConfig {
  if (typeof window === 'undefined') {
    return { appOrigin: defaultAppOrigin };
  }

  const configuredOrigin = window.__RUNTIME_CONFIG__?.appOrigin?.trim();

  if (configuredOrigin) {
    return { appOrigin: normalizeOrigin(configuredOrigin) };
  }

  return { appOrigin: normalizeOrigin(window.location.origin) };
}
