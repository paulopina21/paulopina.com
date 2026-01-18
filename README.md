# paulopina.com

Monorepo para micro-apps na stack Cloudflare.

## Stack
- **Front**: Cloudflare Pages (React + Vite)
- **API**: Cloudflare Workers
- **DB**: Cloudflare D1

## Estrutura
```
paulopina.com/
├─ apps/
│  └─ <app>/
│     ├─ web/      # React + Vite → Cloudflare Pages
│     ├─ api/      # Worker → Cloudflare Workers
│     └─ db/       # D1 migrations
└─ scripts/
   └─ create-app.sh
```

## Apps

| App | Web | API |
|-----|-----|-----|
| hello | hello.paulopina.com | api-hello.paulopina.com |

## Comandos

```bash
# Instalar dependências
npm install

# Dev local
npm run hello:web:dev
npm run hello:api:dev

# Deploy
npm run hello:api:deploy

# Migrations D1
npm run hello:db:migrate:local
npm run hello:db:migrate:remote
```

## Criar novo app

```bash
./scripts/create-app.sh meu-app
```
