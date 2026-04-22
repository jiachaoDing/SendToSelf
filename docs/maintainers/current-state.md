# Current State

## Summary

- Product: self-hosted inbox for one person
- Shape: one web app, one API server, one PostgreSQL database
- Primary flow: send text, links, images, and files to yourself in a timeline

## Scope

- single user
- self-hosted
- web-first
- no team features

## Repository

- monorepo managed from the root `package.json`
- `apps/web`: Next.js client
- `apps/server`: NestJS server with Drizzle and PostgreSQL

## Runtime Model

- local development runs `web` and `server` with `corepack pnpm dev`
- default Docker Compose pulls published images
- development Docker Compose builds from the local repository
- the public entry point is the web app on port `3000`
- the server listens on port `4000` inside the container network

## Authentication

- first-run setup happens at `/setup`
- the instance password is stored as a bcrypt hash in `app_config.password_hash`
- the built-in web client authenticates with the `sts_session` HttpOnly cookie
- JWT payload includes `deviceId` and `authVersion`
- logout invalidates the current device session by rotating `authVersion`

## Data Model

- `devices`: device identity and auth version
- `messages`: timeline messages
- `attachments`: uploaded file metadata
- `app_config`: instance password and config state

## API Surface

API details live in [`../reference/api.md`](../reference/api.md).

## Storage

Docker Compose persists:

- runtime config and generated secrets
- PostgreSQL data
- uploaded files

## Validation Baseline

Validated in this repository:

- `corepack pnpm --filter web build`
- `corepack pnpm --filter server build`
- `corepack pnpm --filter server test:e2e`
