# Development

This repository is a pnpm workspace with two apps:

- `apps/web`: Next.js web client
- `apps/server`: NestJS API server

## Requirements

- Node.js
- pnpm
- PostgreSQL

## Install

```powershell
corepack pnpm install
```

## Environment

Copy the example files:

```powershell
Copy-Item apps/server/.env.example apps/server/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Default local values:

`apps/server/.env`

```env
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/send_to_self
JWT_SECRET=replace-with-a-long-random-string
INSTANCE_NAME=Send to Self
UPLOAD_DIR=./uploads
```

`apps/web/.env.local`

```env
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
SERVER_INTERNAL_API_BASE_URL=http://localhost:4000
```

## Database

Create a local `send_to_self` database, then run:

```powershell
corepack pnpm db:generate
corepack pnpm db:migrate
```

## Run

```powershell
corepack pnpm dev
```

Default local URLs:

- Web: `http://localhost:3000`
- Server: `http://localhost:4000`

On a fresh database:

1. Open `/setup` and set the instance password.
2. Open `/auth/login` and sign in.

## Validation

Use the smallest checks that cover your change:

```powershell
corepack pnpm --filter web build
corepack pnpm --filter server build
corepack pnpm --filter server test:e2e
```

Minimum manual check:

- setup redirects to login after the first password is created
- login opens the timeline
- sending text or links adds a new message
- uploading an image or file creates a new attachment message
- loading older messages and refreshing newer ones both work

## PWA Check

Test install and offline shell behavior in production mode:

```powershell
corepack pnpm --filter web build
corepack pnpm --filter web start
```
