# paulopina.com Monorepo

## Overview
Monorepo for apps deployed to Cloudflare under the domain `paulopina.com`.

## Accounts & Credentials
- **GitHub**: `paulopina21` (git@github-paulopina21:paulopina21/paulopina.com.git)
- **Cloudflare Account ID**: `1393a4b8ac9bc429259644464a7f874e`
- **Cloudflare Zone ID** (paulopina.com): `37038a6e15903aec31eb093374df774a`
- **Credentials**: Stored in `.env.local` (gitignored)

## Deployment Workflow

### Workers (API)
Use `wrangler` for deployment:
```bash
cd apps/<app>/api
npm run deploy
# or: wrangler deploy
```

### Pages (Frontend)
```bash
cd apps/<app>/web
npm run build
wrangler pages deploy dist --project-name=<app> --branch=main
```

### DNS Management
**DO NOT use wrangler for DNS** - the OAuth token has limited permissions.

Use the Cloudflare API with the Global API Key via `scripts/cf.mjs`:
```bash
# List all DNS records
node scripts/cf.mjs list

# Create CNAME (proxied)
node scripts/cf.mjs create <subdomain> <target>
# Example: node scripts/cf.mjs create api-fotocity fotocity-api.paulopina21.workers.dev

# Delete DNS record
node scripts/cf.mjs delete <subdomain>
```

## Apps Structure
```
apps/
  <app>/
    api/          # Cloudflare Worker (TypeScript)
    web/          # Cloudflare Pages (React + Vite)
    db/           # D1 migrations (if needed)
```

## Current Apps
- **hello**: Test app at hello.paulopina.com
- **fotocity**: Photo upload service at fotocity.paulopina.com (api-fotocity.paulopina.com)

## Common Patterns

### Worker wrangler.toml
```toml
name = "<app>-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
account_id = "1393a4b8ac9bc429259644464a7f874e"

workers_dev = true

[[routes]]
pattern = "api-<app>.paulopina.com/*"
zone_name = "paulopina.com"
```

### KV Namespace
Create via wrangler, add to wrangler.toml:
```bash
wrangler kv:namespace create SESSIONS
```

### D1 Database
```bash
wrangler d1 create <app>-db
wrangler d1 execute <app>-db --file=db/schema.sql
```
