# API Reference

This document covers the HTTP API used by the built-in web app.

## Client Model

- browsers call same-origin `/api/*`
- the Next.js app rewrites `/api/*` to the NestJS server
- authentication uses the `sts_session` HttpOnly cookie

## Authentication

- `POST /auth/setup`: set the first instance password
- `POST /auth/login`: sign in and set `sts_session`
- `POST /auth/logout`: clear the current session
- `GET /auth/session`: return the current device session

The server stores `deviceId` and `authVersion` in the JWT payload. Logout invalidates the current device session by rotating `authVersion`.

## Bootstrap

### `GET /client/bootstrap`

Returns the basic instance config used by the web app.

Example:

```json
{
  "instance": {
    "name": "Send to Self",
    "version": "0.0.1"
  },
  "auth": {
    "loginPath": "/auth/login",
    "setupPath": "/setup",
    "requiresSetup": true,
    "logoutPath": "/auth/logout",
    "builtInWeb": "cookie"
  },
  "uploads": {
    "maxBytes": 10737418240
  },
  "attachments": {
    "requiresAuth": true
  }
}
```

Key fields:

- `instance.name`: value from `INSTANCE_NAME`
- `auth.requiresSetup`: `true` before the first password is created
- `uploads.maxBytes`: current single-file limit
- `attachments.requiresAuth`: attachments require an authenticated session

## Auth Endpoints

### `POST /auth/setup`

Request:

```json
{
  "password": "change-me"
}
```

Response:

```json
{
  "ok": true
}
```

Returns `409` if the instance is already initialized.

### `POST /auth/login`

Request:

```json
{
  "password": "change-me",
  "deviceName": "Web Chrome"
}
```

Response:

```json
{
  "device": {
    "id": 1,
    "name": "Web Chrome"
  }
}
```

The session token is set in an HttpOnly cookie, not returned in the JSON body.

### `POST /auth/logout`

Clears `sts_session` and invalidates the current device session.

## Timeline and Attachments

- `GET /timeline`
- `GET /timeline?after=<id>`
- `GET /timeline?before=<id>&limit=<n>`
- `POST /messages/text`
- `POST /messages/link`
- `POST /uploads`
- `HEAD /uploads/:id`
- `PATCH /uploads/:id`
- `DELETE /uploads/:id`
- `GET /attachments/:id`

Notes:

- `/uploads*` uses the tus resumable upload protocol
- uploads are authenticated
- completed uploads create a message and an attachment
- `GET /attachments/:id` also requires authentication

## Timeline Behavior

- `GET /timeline` returns the latest page
- default page size is `50`
- items are returned in ascending `id` order
- `before` loads older messages
- `after` loads only newer messages

The timeline response includes:

- `items`
- `nextCursor`
- `hasMore`
