import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const defaultAppOrigin = 'http://localhost:3000';
const runtimeConfigPath = join(process.cwd(), 'public', 'runtime-config.js');

const appOrigin = (process.env.NEXT_PUBLIC_APP_ORIGIN ?? defaultAppOrigin)
  .trim()
  .replace(/\/$/, '');

const runtimeConfig = `window.__RUNTIME_CONFIG__ = Object.freeze({
  appOrigin: ${JSON.stringify(appOrigin)},
});
`;

mkdirSync(dirname(runtimeConfigPath), { recursive: true });
writeFileSync(runtimeConfigPath, runtimeConfig, 'utf8');
