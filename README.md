# Send to Self

Send to Self is a self-hosted inbox for one person. It lets you send text, links, images, and files to yourself, then keep reading them from a simple chat-style timeline across devices.

## What It Is

- Single-user
- Self-hosted
- Built-in web app
- Focused on capture, not team chat

## Features

- Send plain text and links
- Upload images and files
- Read everything in one timeline
- Continue from another device after login
- Set the instance password on first run

## Quick Start

```powershell
docker compose pull
docker compose up -d
```

Open `http://localhost:3000`.

On the first visit:

1. Open `/setup` and set the instance password.
2. Open `/auth/login` and sign in on the current device.

The default stack starts `postgres`, `server`, and `web`.

## Deployment

For most users, the default `docker-compose.yml` is enough.

- Default URL: `http://localhost:3000`
- Default web port: `3000`
- Optional runtime settings: copy `.env.example` to `.env`

Deployment details: [`docs/deployment.md`](docs/deployment.md)

## Development

Local development and validation: [`docs/development.md`](docs/development.md)

## API

Built-in web API reference: [`docs/reference/api.md`](docs/reference/api.md)

## Scope

This project is intentionally narrow:

- one user
- self-hosted
- web-first
- no team features

## Contributing

Contribution guide: [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Security

Security policy: [`SECURITY.md`](SECURITY.md)

## License

[`MIT`](LICENSE)
