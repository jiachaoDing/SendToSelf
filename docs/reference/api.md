# API Reference

本文档说明当前服务端接口、认证语义，以及远程客户端接入边界。

需要特别说明的是：当前仓库里真正实现并可直接使用的前端只有 Built-in Web。文档中与远程客户端相关的接口和配置，主要是为后续独立客户端预留的接入约定，并不代表仓库当前已经提供远程客户端实现。

## Client Types

### Built-in Web

- 实例自带前端
- 浏览器统一请求同源 `/api/*`
- Next.js 再把 `/api/*` 代理到 NestJS
- 认证承载使用 HttpOnly cookie

### Remote Client

- 直接连接 NestJS
- 认证承载使用 Bearer token
- 远程浏览器客户端会额外受 CORS 约束
- 当前仍未提供官方远程客户端实现

## Auth and Remote Access

- `POST /auth/setup`
  - 实例首次初始化主密码
  - 仅当实例未初始化时可调用
- `POST /auth/login`
  - 内建 Web 的 cookie 登录入口
  - 实例已初始化后才可调用
  - 成功后写入 `sts_session` HttpOnly cookie
- `POST /auth/token`
  - 远程客户端的 Bearer token 获取入口
  - 实例已初始化后才可调用
  - 成功后返回 `{ token, device }`
  - 当 `REMOTE_CLIENT_ENABLED=false` 时返回 `403`
- `POST /auth/logout`
  - 失效当前设备当前 token
  - cookie 与 bearer 都可调用
- 受保护业务接口
  - 当前统一接受：
    - `Cookie: sts_session=<jwt>`
    - `Authorization: Bearer <jwt>`
  - 当 `REMOTE_CLIENT_ENABLED=false` 时：
    - cookie 仍可用
    - bearer 会被拒绝

JWT payload 当前包含：

- `deviceId`
- `authVersion`

服务端会在验签后继续比对设备当前 `authVersion`，因此 `POST /auth/logout` 可以立即使当前设备旧 token 失效。

## CORS

CORS 只影响“浏览器直接跨域请求 NestJS”的场景，不影响：

- 内建 Web 通过同源 `/api/*` 访问
- curl / PowerShell / 原生客户端等无浏览器同源策略的请求

相关配置：

- `REMOTE_CLIENT_ENABLED`
  - 是否允许远程客户端接入
- `REMOTE_CLIENT_ALLOWED_ORIGINS`
  - 远程浏览器客户端允许的 origin 列表
  - 支持逗号分隔
  - 显式设为空字符串时，表示不允许任何跨域浏览器 origin

## Bootstrap

### `GET /client/bootstrap`

给未来远程客户端“首次连接某个实例”时使用的最小只读接口。

当前返回：

```json
{
  "instance": {
    "name": "Send to Self",
    "version": "0.0.1"
  },
  "remoteClient": {
    "enabled": false
  },
  "auth": {
    "loginPath": "/auth/login",
    "setupPath": "/setup",
    "requiresSetup": true,
    "tokenPath": "/auth/token",
    "logoutPath": "/auth/logout",
    "builtInWeb": "cookie",
    "remoteClient": "disabled"
  },
  "uploads": {
    "maxBytes": 10737418240
  },
  "attachments": {
    "requiresAuth": true
  }
}
```

字段说明：

- `instance.name`
  - 实例显示名，来自 `INSTANCE_NAME`
- `instance.version`
  - 当前服务端版本占位
- `remoteClient.enabled`
  - 当前实例是否开放远程客户端
- `auth`
  - 当前最小认证说明
  - `requiresSetup=true` 表示实例还没有设置主密码
- `uploads.maxBytes`
  - 当前上传大小限制
- `attachments.requiresAuth`
  - 附件访问是否需要认证

## Auth API

### `POST /auth/setup`

请求体：

```json
{
  "password": "change-me"
}
```

响应体：

```json
{
  "ok": true
}
```

说明：

- 该接口用于实例首次设置主密码
- 已初始化实例调用时返回 `409`

### `POST /auth/login`

请求体：

```json
{
  "password": "change-me",
  "deviceName": "Web Chrome"
}
```

响应体：

```json
{
  "device": {
    "id": 1,
    "name": "Web Chrome"
  }
}
```

说明：

- 该接口主要给内建 Web 使用
- 未初始化实例调用时返回 `409`
- token 不放在响应体中，而是写入 HttpOnly cookie

### `POST /auth/token`

请求体与 `POST /auth/login` 相同。

响应体：

```json
{
  "token": "<jwt>",
  "device": {
    "id": 1,
    "name": "Remote Client"
  }
}
```

说明：

- 该接口主要给远程客户端使用
- 未初始化实例调用时返回 `409`
- 当 `REMOTE_CLIENT_ENABLED=false` 时返回 `403`

### `POST /auth/logout`

行为：

- 尝试 revoke 当前请求携带的 token
- 清理 `sts_session` cookie

### `GET /auth/session`

返回当前会话对应的设备信息。

## Timeline, Message, Attachment API

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

其中：

- `/uploads*`
  - 使用 tus resumable upload 协议
  - 受保护接口，继续统一接受 cookie 与 bearer
  - 内建 Web 统一请求同源 `/api/uploads*`，再由 Next.js rewrite 代理到 `/uploads*`
  - 服务端在上传完成后自动创建 message 与 attachment
  - `uploads.maxBytes` 表示单个文件总大小上限，当前默认是 `10 GiB`
- `GET /attachments/:id`
  - 当前仍要求认证
  - 不使用签名 URL
  - 内建 Web 走 cookie
  - 远程客户端走 bearer

当前不再保留 `POST /attachments/upload`。

## Timeline Behavior

- `GET /timeline`
  - 默认只返回最近一页消息
  - 默认页大小是 `50`
  - 返回顺序仍然是消息 `id` 升序
- `GET /timeline?before=<id>&limit=<n>`
  - 返回 `<id>` 之前的更旧消息
  - 适合前端做“加载更早消息”
- `GET /timeline?after=<id>`
  - 保留增量同步语义
  - 只返回比 `<id>` 更新的消息

timeline 响应当前包含：

- `items`
- `nextCursor`
- `hasMore`
