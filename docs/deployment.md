# Deployment

本文档说明当前版本的基础部署方式。

当前部署出来的是“服务端 + 内建 Web 前端”这一种形态。远程客户端接入能力还处于后续规划阶段，仓库当前没有提供独立的远程客户端应用。

## Current State

当前项目更适合部署为一个简单的自托管实例：

- 一个 PostgreSQL 数据库
- 一个 Node.js 服务端进程
- 一个 Next.js Web 进程
- 本地磁盘附件目录

当前仓库还没有提供：

- Docker Compose
- 一键部署脚本
- Kubernetes 配置
- 对象存储适配

## Requirements

- Node.js
- pnpm
- PostgreSQL
- 可持久化的本地磁盘目录

## Environment Files

部署前需要准备：

- `apps/server/.env`
- `apps/web/.env.local`

可参考：

- `apps/server/.env.example`
- `apps/web/.env.example`

最小配置示例：

`apps/server/.env`

```env
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/send_to_self
JWT_SECRET=replace-with-a-long-random-string
INSTANCE_NAME=Send to Self
UPLOAD_DIR=./uploads
REMOTE_CLIENT_ENABLED=false
REMOTE_CLIENT_ALLOWED_ORIGINS=
```

`apps/web/.env.local`

```env
NEXT_PUBLIC_APP_ORIGIN=https://your-domain.example
SERVER_INTERNAL_API_BASE_URL=http://127.0.0.1:4000
```

说明：

- `NEXT_PUBLIC_APP_ORIGIN` 应设置为用户实际访问的公开地址
- `SERVER_INTERNAL_API_BASE_URL` 是 Next.js 到服务端的内部地址，通常不需要暴露到公网
- `UPLOAD_DIR` 应指向持久化目录
- 生产环境必须设置强随机 `JWT_SECRET`
- 新实例首次访问 Web 时，需要先通过 `/setup` 设置主密码

## Build

在仓库根目录执行：

```powershell
pnpm install
pnpm build
```

## Database Migration

先创建数据库，再执行迁移：

```powershell
pnpm db:generate
pnpm db:migrate
```

## Start

当前生产运行可以分别启动两个进程。

启动服务端：

```powershell
pnpm --filter server start:prod
```

启动 Web：

```powershell
pnpm --filter web start
```

默认端口：

- Web: `3000`
- Server: `4000`

## Reverse Proxy

推荐把公开流量接到 Web 进程，再由 Web 通过同源 `/api/*` 转发到服务端。

这意味着：

- 用户主要访问 Web 域名
- 浏览器不需要直接跨域访问 `:4000`
- `SERVER_INTERNAL_API_BASE_URL` 可以继续使用内网地址或本机地址

## Storage

当前附件存储在本地磁盘。

部署时请注意：

- `UPLOAD_DIR` 需要持久化
- 备份时不能只备份数据库，也要备份附件目录
- 当前没有对象存储抽象层

## Production Notes

- 当前项目是单用户实例，不是多用户 SaaS
- 当前没有实时推送能力
- 当前离线能力只覆盖应用壳，不覆盖完整离线同步
- 如果你开放远程客户端接入，需要额外正确配置 `REMOTE_CLIENT_ENABLED` 和 `REMOTE_CLIENT_ALLOWED_ORIGINS`
