#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${1:-}"
if [ -z "$APP_NAME" ]; then
  echo "usage: ./scripts/create-app.sh <app-name>"
  exit 1
fi

if [ -d "apps/$APP_NAME" ]; then
  echo "error: apps/$APP_NAME already exists"
  exit 1
fi

cp -R "apps/hello" "apps/$APP_NAME"

# rename strings
perl -pi -e "s/hello/$APP_NAME/g" "apps/$APP_NAME/api/wrangler.toml"
perl -pi -e "s/hello/$APP_NAME/g" "apps/$APP_NAME/api/package.json"
perl -pi -e "s/hello/$APP_NAME/g" "apps/$APP_NAME/web/index.html"
perl -pi -e "s/hello/$APP_NAME/g" "apps/$APP_NAME/web/src/App.tsx"
perl -pi -e "s/hello/$APP_NAME/g" "apps/$APP_NAME/web/package.json"

echo "Created apps/$APP_NAME"
echo ""
echo "Next steps:"
echo "  1. Create D1 database: wrangler d1 create ${APP_NAME}_db"
echo "  2. Update database_id in apps/$APP_NAME/api/wrangler.toml"
echo "  3. Add scripts to root package.json"
echo "  4. Run migrations: npm run ${APP_NAME}:db:migrate:remote"
