# Deployment

This project ships with a Docker Compose setup for self-hosting.

## Default Stack

The default `docker-compose.yml` starts:

- `postgres` for application data
- `server` for the API and uploads
- `web` for the built-in web app

The public entry point is `http://localhost:3000`.

## Quick Start

From the repository root:

```powershell
docker compose pull
docker compose up -d
```

Then:

1. Open `http://localhost:3000`.
2. Open `/setup` and set the instance password.
3. Open `/auth/login` and sign in on the current device.

## Ports

Only the web service is exposed by default:

```yaml
ports:
  - "3000:3000"
```

To use another host port, change the left side and restart:

```powershell
docker compose up -d
```

## Optional Configuration

You do not need a `.env` file for the default setup.

If you want to override runtime values, copy `.env.example` to `.env` in the repository root:

```powershell
Copy-Item .env.example .env
```

Available overrides:

```env
POSTGRES_DB=send_to_self
POSTGRES_USER=postgres
INSTANCE_NAME=Send to Self
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
```

Use `IMAGE_TAG` in `.env` if you want to pin the image version.

If you only changed `NEXT_PUBLIC_APP_ORIGIN`, recreate the web container:

```powershell
docker compose up -d --force-recreate web
```

## Persistence

Compose creates three named volumes:

- `runtime-config` for generated runtime secrets and database settings
- `postgres-data` for PostgreSQL data
- `server-uploads` for uploaded files

Back up all three if you want a restorable instance.

## Local Image Builds

To build all services from the current repository instead of pulling published images:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

## Reverse Proxy

If you put the app behind a domain or HTTPS proxy, point the proxy to `web:3000`.
