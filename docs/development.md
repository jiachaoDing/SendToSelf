# Development

本文档面向本地开发和仓库贡献者。

当前真正实现的前端只有实例内建的 Web。远程客户端相关接口和配置是为后续扩展预留的，不代表仓库当前已经提供可直接使用的独立客户端。

## Repository Layout

这是一个 monorepo：

- `apps/server`
  - NestJS + Drizzle + PostgreSQL + `@tus/server`
- `apps/web`
  - Next.js App Router + Tailwind CSS

## Requirements

- Node.js
- pnpm
- PostgreSQL

## Install

```powershell
pnpm install
```

## Environment

复制并修改：

- `apps/server/.env.example` -> `apps/server/.env`
- `apps/web/.env.example` -> `apps/web/.env.local`

推荐最小配置如下。

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

说明：

- `SERVER_INTERNAL_API_BASE_URL` 通常保持 `http://localhost:4000` 即可，因为它是 Next 服务到同机 Nest 服务的内部地址
- 当前内建 Web 统一走同源 `/api/*`
- 只有未来远程浏览器客户端直接跨域访问 `:4000` 时，才会受 `REMOTE_CLIENT_ALLOWED_ORIGINS` 约束

## Database

先在本地创建 `send_to_self` 数据库，然后执行：

```powershell
pnpm db:generate
pnpm db:migrate
```

## Run

```powershell
pnpm dev
```

默认地址：

- Web: `http://localhost:3000`
- Server: `http://localhost:4000`

## Validation

提交前建议至少执行：

```powershell
pnpm --filter web lint
pnpm --filter web build
pnpm --filter server lint
pnpm --filter server build
pnpm --filter server test:e2e
```

可手动验证的最小链路：

- 登录后首次进入聊天页，只看到最近一页消息
- 点击聊天页顶部“加载更早消息”，继续拿到更旧的消息
- 点击“手动刷新”，只追加最新消息，不重置已加载历史
- 发送文本、链接后，消息仍正常出现在列表底部
- 上传图片、文件时能看到基础进度，成功后 timeline 会刷新出新文件消息
- `GET /client/bootstrap` 能正确反映 `REMOTE_CLIENT_ENABLED`
- `REMOTE_CLIENT_ENABLED=false` 时，`POST /auth/token` 与 Bearer 访问受保护接口会被拒绝

## PWA Notes

PWA 相关能力建议在生产模式验证：

```powershell
pnpm --filter web build
pnpm --filter web start
```

注意：

- 不要使用 `next dev` 验证安装与离线行为
- 首次必须在线访问一次，让浏览器完成 manifest 获取和 service worker 注册
- 当前离线模式只保证应用壳可打开，不支持离线消息同步或离线发送
