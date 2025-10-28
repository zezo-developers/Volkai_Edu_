#!/bin/sh
set -e

echo "🔄 Waiting for postgres to be ready..."
until nc -z postgres 5432; do
  echo "⏳ Waiting for postgres..."
  sleep 2
done

echo "✅ Postgres is ready!"

echo "🔄 Running database migrations..."
npm run migration:run || echo "⚠️  No migrations to run or migration failed"

echo "🚀 Starting application..."
exec node dist/main.js