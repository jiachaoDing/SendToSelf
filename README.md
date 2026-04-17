# Send to Self

一个单用户、自托管、聊天界面的个人多端同步收件箱。

当前仓库只包含可运行的最小骨架：

- `apps/server`: NestJS + Drizzle + PostgreSQL + Multer
- `apps/web`: Next.js App Router + Tailwind CSS

如果你是新接手的工程师或 AI，请先看：

- [CURRENT.md](D:/project/SendToSelf/CURRENT.md)
- [API.md](D:/project/SendToSelf/API.md)

## 目录结构

```text
.
├─ apps
│  ├─ server
│  │  ├─ src
│  │  └─ .env.example
│  └─ web
│     ├─ app
│     ├─ components
│     └─ .env.example
├─ .env.example
├─ package.json
└─ pnpm-workspace.yaml
```

## 本地启动

### 1. 安装依赖

```powershell
pnpm install
```

### 2. 配置环境变量

把下面两个文件复制出来并按本机环境修改：

- `apps/server/.env`
- `apps/web/.env.local`

可直接参考：

- [apps/server/.env.example](D:/project/SendToSelf/apps/server/.env.example)
- [apps/web/.env.example](D:/project/SendToSelf/apps/web/.env.example)

推荐的最小配置如下：

`apps/server/.env`

```env
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/send_to_self
APP_PASSWORD=change-me
JWT_SECRET=replace-with-a-long-random-string
INSTANCE_NAME=Send to Self
UPLOAD_DIR=./uploads
REMOTE_CLIENT_ENABLED=false
REMOTE_CLIENT_ALLOWED_ORIGINS=http://localhost:5173
```

`apps/web/.env.local`

```env
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
SERVER_INTERNAL_API_BASE_URL=http://localhost:4000
```

### 3. 创建数据库

你当前机器没有把 `psql` 加到环境变量，所以直接使用绝对路径：

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -U postgres -d postgres -c "CREATE DATABASE send_to_self;"
```

如果数据库已存在，这一步会报已存在错误，可以忽略。

### 4. 生成并执行迁移

```powershell
pnpm db:generate
pnpm db:migrate
```

### 5. 启动开发环境

```powershell
pnpm dev
```

启动后：

- Web: `http://localhost:3000`
- Server: `http://localhost:4000`

Web 现在统一请求同源 `/api/*`，再由 Next.js 代理到 `SERVER_INTERNAL_API_BASE_URL`。

如果需要从手机或局域网其他设备访问：

- Web 侧通常只需要把 `apps/web/.env.local` 里的 `NEXT_PUBLIC_APP_ORIGIN` 改成你的局域网地址，例如 `http://10.27.208.201:3000`
- `SERVER_INTERNAL_API_BASE_URL` 通常不需要改，保持 `http://localhost:4000` 即可，因为它是 Next 服务器到同机 Nest 服务的内部地址
- 当前内建 Web 继续走同源 `/api/*`，不依赖 `REMOTE_CLIENT_ALLOWED_ORIGINS`
- 只有未来远程浏览器客户端直接跨域访问 `:4000` 时，才会受 `REMOTE_CLIENT_ALLOWED_ORIGINS` 约束

## 已打通的最小闭环

- 单用户密码登录
- 登录时注册/更新设备标识
- 唯一聊天时间线
- 发送文本消息
- 粘贴链接后按链接消息发送
- 上传图片
- 上传普通文件
- 首次进入只加载最近一页 timeline
- 顶部按钮懒加载更早消息
- 手动刷新拉取最新消息
- 增量拉取 `GET /timeline?after=<id>`
- 每条消息显示发送设备标识

## 认证模型

- 后端认证本体统一是 JWT token
- token payload 现在包含 `deviceId` 和该设备当前的 `authVersion`
- 内建 Web 继续通过同源 `/api/*` + `sts_session` HttpOnly cookie 持有 token
- 未来远程客户端通过 `POST /auth/token` 获取 Bearer token，并用 `Authorization: Bearer <token>` 访问受保护接口
- `POST /auth/logout` 会清理 Web cookie，并尝试 revoke 当前设备当前 token

当前 Web 继续使用 cookie，原因是：

- Web 是实例内建前端，不是任意后端地址的通用浏览器客户端
- 浏览器已经统一走 Next.js 同源 `/api/*` 代理，cookie 承载最自然
- token 仍然放在 HttpOnly cookie 中，不暴露给前端 JS

当前 auth 接口分工是：

- `POST /auth/login`
  - 内建 Web 的 cookie 登录入口
- `POST /auth/token`
  - 未来远程客户端的 Bearer token 获取入口
  - 当 `REMOTE_CLIENT_ENABLED=false` 时返回 `403`
- `POST /auth/logout`
  - 失效当前设备当前 token
  - cookie 和 bearer 都可调用
- 受保护业务接口
  - 当前仍统一支持 cookie 与 bearer 两种承载方式
- `GET /attachments/:id`
  - 继续复用同一认证模型，不单独引入下载 token 或签名 URL

## 远程客户端与 CORS

- `REMOTE_CLIENT_ENABLED`
  - 控制实例是否接受远程客户端 Bearer 模式接入
  - `false` 时：
    - `POST /auth/token` 返回 `403`
    - 受保护接口拒绝 Bearer 请求
    - 内建 Web 的 cookie 链路继续可用
- `REMOTE_CLIENT_ALLOWED_ORIGINS`
  - 只用于远程浏览器客户端的跨域访问来源白名单
  - 支持逗号分隔
  - 显式设为空字符串时，表示不允许任何跨域浏览器 origin
  - 仅在浏览器直接请求 `http://<server>:4000` 时参与 CORS 判断

远程浏览器客户端会受 CORS 约束，是因为它们直接从自己的 origin 向 NestJS 发起跨域请求；而内建 Web 先请求同源 `/api/*`，再由 Next.js 在服务端代理到 NestJS，所以不依赖 CORS。

## API

- `GET /client/bootstrap`
- `POST /auth/login`
- `POST /auth/token`
- `POST /auth/logout`
- `GET /auth/session`
- `GET /timeline`
- `GET /timeline?after=<id>`
- `GET /timeline?before=<id>&limit=<n>`
- `POST /messages/text`
- `POST /messages/link`
- `POST /attachments/upload`
- `GET /attachments/:id`

受保护接口同时支持两种 token 承载方式：

- Cookie: `sts_session=<jwt>`
- Header: `Authorization: Bearer <jwt>`

`GET /client/bootstrap` 是给未来远程客户端首次连接实例时使用的最小只读接口，当前返回：

- 实例名
- 服务端版本
- 是否允许远程客户端
- `login` / `token` / `logout` 的最小认证说明
- 上传大小限制
- 附件是否要求认证

## Timeline 分页语义

- `GET /timeline`
  - 不再返回全量历史
  - 默认只返回最近一页消息，当前默认页大小是 `50`
  - 返回顺序仍然是按消息 `id` 升序，便于前端直接渲染
- `GET /timeline?before=<id>&limit=<n>`
  - 返回比 `<id>` 更旧的一页消息
  - 适合前端“加载更早消息”
- `GET /timeline?after=<id>`
  - 保留原有增量刷新语义
  - 只返回比 `<id>` 更新的消息

timeline 响应现在包含：

- `items`: 当前这一页或这次增量的消息列表
- `nextCursor`: 当前结果里的最新消息 id，前端继续用于 `after`
- `hasMore`: 当前方向上是否还有更多消息

Web 聊天页现在的行为是：

- 首次进入只拉最近一页
- 顶部显示“加载更早消息”按钮，点击后请求 `before`
- “手动刷新”继续请求 `after=<latestId>`
- 新发送文本、链接、图片、文件后，仍然直接追加到底部显示

当前 revoke/version 机制是：

- 每个设备有独立的 `authVersion`
- JWT 签发时会把 `authVersion` 一起写入 token
- 受保护接口校验签名后，会再比对设备当前 `authVersion`
- `POST /auth/logout` 会把当前设备的 `authVersion` 加一，因此这台设备上之前签发的旧 token 会立刻失效

## 认证验证示例

### Web cookie 链路

浏览器侧无需手动处理 token：

- `POST /api/auth/login` 登录后，NestJS 会写入 `sts_session` HttpOnly cookie
- 后续 `/api/auth/session`、`/api/timeline`、`/api/messages/*`、`/api/attachments/upload` 会自动带上 cookie

如果要在命令行验证 cookie 链路，可以这样做：

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-WebRequest -Method POST -Uri http://localhost:4000/auth/login `
  -WebSession $session `
  -ContentType 'application/json' `
  -Body '{"password":"change-me","deviceName":"Web Smoke"}'

Invoke-WebRequest -Method GET -Uri http://localhost:4000/auth/session `
  -WebSession $session
```

### Bearer token 链路

先获取 token：

```powershell
$login = Invoke-RestMethod -Method POST -Uri http://localhost:4000/auth/token `
  -ContentType 'application/json' `
  -Body '{"password":"change-me","deviceName":"CLI Smoke"}'
```

再带 Bearer 访问受保护接口：

```powershell
Invoke-RestMethod -Method GET -Uri http://localhost:4000/timeline `
  -Headers @{ Authorization = "Bearer $($login.token)" }
```

如果要显式 revoke 当前 Bearer token：

```powershell
Invoke-RestMethod -Method POST -Uri http://localhost:4000/auth/logout `
  -Headers @{ Authorization = "Bearer $($login.token)" }
```

### 远程客户端模式开关验证

先看实例 bootstrap：

```powershell
Invoke-RestMethod -Method GET -Uri http://localhost:4000/client/bootstrap
```

当 `REMOTE_CLIENT_ENABLED=false` 时，应看到：

- `remoteClient.enabled=false`
- `auth.remoteClient=disabled`
- `POST /auth/token` 返回 `403`

当 `REMOTE_CLIENT_ENABLED=true` 且来源已在 `REMOTE_CLIENT_ALLOWED_ORIGINS` 中时：

- `remoteClient.enabled=true`
- `auth.remoteClient=bearer`
- 浏览器远程客户端可跨域访问 `:4000`

## 本地验证

功能改动完成后，至少执行：

```powershell
pnpm --filter web lint
pnpm --filter web build
pnpm --filter server lint
pnpm --filter server build
pnpm --filter server test:e2e
```

可手动验证的最小链路：

- 登录后首次进入聊天页，只看到最近一页消息，而不是全量历史
- 点击聊天页顶部“加载更早消息”，继续拿到更旧的消息
- 点击“手动刷新”，只追加最新消息，不重置已加载历史
- 发送文本、链接、图片、文件后，消息仍正常出现在列表底部
- `GET /client/bootstrap` 能正确反映 `REMOTE_CLIENT_ENABLED`
- `REMOTE_CLIENT_ENABLED=false` 时，`POST /auth/token` 与 Bearer 访问受保护接口会被拒绝
- `GET /attachments/:id` 仍要求统一认证：
  - Web 通过 cookie 访问 `/api/attachments/:id`
  - 远程客户端通过 Bearer 访问 `/attachments/:id`

## 当前约束

- 单用户
- 单聊天流
- 本地磁盘存储附件
- 无 WebSocket
- 无多用户、多租户、标签、搜索增强、已读未读等能力
