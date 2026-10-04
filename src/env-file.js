import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadRuntimeEnv(appRoot) {
  const envPath = resolve(appRoot, '.runtime', 'genesis-landing.env');
  if (!existsSync(envPath)) return { loaded: false, envPath };

  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;

    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = unquote(rawValue);
  }

  return { loaded: true, envPath };
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
