import fs from 'node:fs';
import path from 'node:path';

export function loadDotEnv() {
  // super-lightweight .env loader (no dependency)
  const p = path.join(process.cwd(), '.env');
  if (!fs.existsSync(p)) return;
  const lines = fs.readFileSync(p, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const k = m[1];
    let v = m[2] || '';
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
