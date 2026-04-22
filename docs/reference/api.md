# API Reference

本文档说明当前内建 Web 会使用到的服务端接口与认证语义。

## Client Model

- 实例自带 Web 前端
- 浏览器统一请求同源 `/api/*`
- Next.js 再把 `/api/*` 转发到 NestJS
- 认证承载使用 `sts_session` HttpOnly cookie

## Auth

- `POST /auth/setup`
  - 实例首次初始化主密码
  - 仅当实例未初始化时可调用
- `POST /auth/login`
  - Web 登录入口
  - 实例已初始化后才可调用
  - 成功后写入 `sts_session` HttpOnly cookie
- `POST /auth/logout`
  - 失效当前设备当前会话
  - 清理 `sts_session` cookie
- 受保护业务接口
  - 当前通过 `sts_session` cookie 鉴权

JWT payload 当前包含：

- `deviceId`
- `authVersion`

服务端会在验签后继续比对设备当前 `authVersion`，因此 `POST /auth/logout` 可以立即使当前设备旧会话失效。

## Bootstrap

### `GET /client/bootstrap`

内建 Web 会在首屏读取实例基础配置。

当前会用到的关键字段包括：

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

字段说明：

- `instance.name`
  - 实例显示名，来自 `INSTANCE_NAME`
- `instance.version`
  - 当前服务端版本
- `auth.requiresSetup`
  - `true` 表示实例还没有设置主密码
- `uploads.maxBytes`
  - 单个文件大小上限，当前默认是 `10 GiB`
- `attachments.requiresAuth`
  - 附件访问要求登录态

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

- 该接口给内建 Web 使用
- 未初始化实例调用时返回 `409`
- token 不放在响应体中，而是写入 HttpOnly cookie

### `POST /auth/logout`

行为：

- 尝试失效当前请求携带的会话
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
  - 受保护接口
  - 内建 Web 统一请求同源 `/api/uploads*`，再由 Next.js rewrite 转发到 `/uploads*`
  - 服务端在上传完成后自动创建 message 与 attachment
- `GET /attachments/:id`
  - 当前要求认证
  - 不使用签名 URL

## Timeline Behavior

- `GET /timeline`
  - 默认只返回最近一页消息
  - 默认页大小是 `50`
  - 返回顺序仍然是消息 `id` 升序
- `GET /timeline?before=<id>&limit=<n>`
  - 返回 `<id>` 之前的更旧消息
  - 适合前端做“加载更早消息”
- `GET /timeline?after=<id>`
  - 只返回比 `<id>` 更新的消息

timeline 响应当前包含：

- `items`
- `nextCursor`
- `hasMore`
