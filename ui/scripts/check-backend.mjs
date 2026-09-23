import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';

const env = {};
for (const file of ['.env', '.env.local']) {
  if (existsSync(file)) Object.assign(env, parseEnv(readFileSync(file, 'utf8')));
}
Object.assign(env, process.env);
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
let publicKey = key?.startsWith('sb_publishable_');
try { publicKey ||= JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon'; } catch {}
if (!url || !publicKey) {
  console.error('FAIL: Configure a Supabase URL and public anon/publishable key.');
  process.exit(1);
}
const checks = [
  ['Auth', '/auth/v1/settings'],
  ['Report schema', '/rest/v1/safety_reports?select=id&limit=0'],
  ['Moderation RPC', '/rest/v1/rpc/moderate_report'],
];
for (const [name, path] of checks) {
  try {
    const rpc = name === 'Moderation RPC';
    const response = await fetch(new URL(path, url), {
      method: rpc ? 'POST' : 'GET',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      ...(rpc ? { body: JSON.stringify({ target_report: '00000000-0000-0000-0000-000000000000', new_status: 'reviewed', reason: 'Health check' }) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json();
    // Anonymous moderation must be denied, with a real function present.
    const ok = rpc ? body.code === '42501' : response.ok;
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${name} (HTTP ${response.status}${body.code ? `, ${body.code}` : ''})`);
    if (!ok) process.exitCode = 1;
  } catch {
    console.error(`FAIL: ${name} unreachable. Check network and project URL.`);
    process.exitCode = 1;
  }
}
