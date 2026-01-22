#!/usr/bin/env node
/**
 * Cloudflare DNS Manager
 * Usage:
 *   node scripts/cf.mjs list                     - Lista todos os DNS records
 *   node scripts/cf.mjs create <name> <target>   - Cria CNAME proxied
 *   node scripts/cf.mjs delete <name>            - Deleta DNS record
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');

// Load env
const env = {};
try {
  readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && !key.startsWith('#')) env[key.trim()] = val.join('=').trim();
  });
} catch {
  console.error('Error: .env.local not found. Create it with CF_API_KEY, CF_EMAIL, CF_ZONE_ID');
  process.exit(1);
}

const { CF_API_KEY, CF_EMAIL, CF_ZONE_ID } = env;

async function cfApi(endpoint, method = 'GET', body = null) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}${endpoint}`, {
    method,
    headers: { 'X-Auth-Email': CF_EMAIL, 'X-Auth-Key': CF_API_KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  });
  return res.json();
}

async function list() {
  const data = await cfApi('/dns_records?per_page=100');
  if (!data.success) return console.error('Error:', data.errors);

  console.log('DNS Records:');
  data.result
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(r => console.log(`  ${r.type.padEnd(6)} ${r.name.padEnd(35)} -> ${r.content}`));
}

async function create(name, target) {
  if (!name || !target) return console.log('Usage: cf.mjs create <name> <target>');

  const data = await cfApi('/dns_records', 'POST', {
    type: 'CNAME', name, content: target, ttl: 1, proxied: true
  });

  if (data.success) {
    console.log(`✓ Created: ${name}.paulopina.com -> ${target}`);
  } else {
    console.error('Error:', data.errors[0]?.message);
  }
}

async function del(name) {
  if (!name) return console.log('Usage: cf.mjs delete <name>');

  const fullName = name.includes('.') ? name : `${name}.paulopina.com`;
  const records = await cfApi(`/dns_records?name=${fullName}`);

  if (!records.result?.length) return console.log('Record not found');

  for (const r of records.result) {
    const del = await cfApi(`/dns_records/${r.id}`, 'DELETE');
    console.log(del.success ? `✓ Deleted: ${r.name}` : `Error: ${del.errors[0]?.message}`);
  }
}

const [,, cmd, ...args] = process.argv;
if (cmd === 'list') list();
else if (cmd === 'create') create(args[0], args[1]);
else if (cmd === 'delete') del(args[0]);
else console.log('Usage: cf.mjs [list|create|delete]');
