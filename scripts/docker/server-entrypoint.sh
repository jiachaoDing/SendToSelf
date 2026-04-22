#!/bin/sh
set -eu

. /config/runtime.env

export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-4000}"
export INSTANCE_NAME="${INSTANCE_NAME:-Send to Self}"
export UPLOAD_DIR="${UPLOAD_DIR:-/data/uploads}"
export REMOTE_CLIENT_ENABLED="${REMOTE_CLIENT_ENABLED:-false}"
export REMOTE_CLIENT_ALLOWED_ORIGINS="${REMOTE_CLIENT_ALLOWED_ORIGINS:-}"
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"
export JWT_SECRET

corepack pnpm db:migrate
exec corepack pnpm --filter server start:prod
