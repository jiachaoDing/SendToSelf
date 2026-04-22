# Development

本文档面向本地开发和仓库贡献者。

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
corepack pnpm install
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
JWT_SECRET=replace-with-a-long-random-string
INSTANCE_NAME=Send to Self
UPLOAD_DIR=./uploads
```

`apps/web/.env.local`

```env
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
SERVER_INTERNAL_API_BASE_URL=http://localhost:4000
```

说明：

- `SERVER_INTERNAL_API_BASE_URL` 是 Next.js 到 NestJS 的内部地址
- 浏览器统一请求同源 `/api/*`
- `UPLOAD_DIR` 应指向可写目录

## Database

先在本地创建 `send_to_self` 数据库，然后执行：

```powershell
corepack pnpm db:generate
corepack pnpm db:migrate
```

## Run

```powershell
corepack pnpm dev
```

默认地址：

- Web: `http://localhost:3000`
- Server: `http://localhost:4000`

首次访问 Web 时，先进入 `/setup` 设置主密码；设置成功后再通过 `/auth/login` 为当前设备登录。

## Validation

提交前建议至少执行：

```powershell
corepack pnpm --filter web build
corepack pnpm --filter server build
corepack pnpm --filter server test:e2e
```

可手动验证的最小链路：

- 全新数据库启动后，访问 `/` 会先跳到 `/setup`
- `/setup` 成功后会跳到 `/auth/login`
- 登录后首次进入聊天页，只看到最近一页消息
- 点击聊天页顶部“加载更早消息”，继续拿到更旧的消息
- 点击“手动刷新”，只追加最新消息，不重置已加载历史
- 发送文本、链接后，消息仍正常出现在列表底部
- 上传图片、文件时能看到基础进度，成功后 timeline 会刷新出新文件消息

## PWA Notes

PWA 相关能力建议在生产模式验证：

```powershell
corepack pnpm --filter web build
corepack pnpm --filter web start
```

注意：

- 不要使用 `next dev` 验证安装与离线行为
- 首次必须在线访问一次，让浏览器完成 manifest 获取和 service worker 注册
- 当前离线模式只保证应用壳可打开，不支持离线消息同步或离线发送
