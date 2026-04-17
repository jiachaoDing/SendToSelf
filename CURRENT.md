# Current State

本文件给后续进入仓库的工程师或 AI 使用，目标是快速说明当前仓库现状，而不是重复 PRD。

## Project Summary

- 项目名：Send to Self / 发给自己
- 产品定义：单用户、自托管、聊天界面的个人多端同步收件箱
- 当前阶段：只做后端 + Web 前端的最小可运行骨架
- 明确不做：多人、群聊、实时推送、标签、文件夹、收藏、复杂 auth、移动端和桌面端实现

## Repository Layout

```text
.
├─ apps
│  ├─ server
│  │  ├─ src
│  │  │  ├─ auth
│  │  │  ├─ attachments
│  │  │  ├─ common
│  │  │  ├─ config
│  │  │  ├─ database
│  │  │  ├─ devices
│  │  │  ├─ messages
│  │  │  ├─ scripts
│  │  │  └─ sync
│  │  ├─ drizzle
│  │  └─ test
│  └─ web
│     ├─ app
│     ├─ components
│     └─ lib
├─ README.md
├─ CURRENT.md
└─ pnpm-workspace.yaml
```

## Implemented Today

- 已初始化 monorepo，根命令由 [package.json](/D:/project/SendToSelf/package.json) 管理
- 后端已搭好：
  - NestJS modular monolith
  - Drizzle ORM + PostgreSQL
  - schema 与 migration
  - 文件上传到本地磁盘
  - 附件下载/图片访问
  - 单用户密码登录
  - 登录时注册设备
  - timeline 历史分页 + 增量拉取
- 前端已搭好：
  - 登录页
  - 主聊天页
  - 文本/链接发送
  - 图片/文件上传
  - 首屏最近一页加载
  - 顶部按钮懒加载更早消息
  - 手动刷新增量更新
  - 设备标识展示

## Current API Surface

- 当前接口清单、请求示例、认证与 CORS 语义统一维护在：
  - [API.md](/D:/project/SendToSelf/API.md)

## Current Auth Model

- 后端认证本体是 JWT token，当前 payload 包含 `deviceId` 与 `authVersion`
- 内建 Web 继续使用 cookie，远程客户端使用 bearer
- `REMOTE_CLIENT_ENABLED=false` 时，实例只保留内建 Web cookie 链路
- 下游业务只消费 `request.auth.deviceId`，不关心 token 来源
- 每个设备有独立的 `authVersion`
- `POST /auth/logout` 会清 cookie，并尝试把当前设备的 `authVersion` 加一，使当前设备旧 token 失效
- 更具体的接口分工见：
  - [API.md](/D:/project/SendToSelf/API.md#认证与远程访问)

## Current Data Model

- `devices`
  - `id`
  - `name`
  - `auth_version`
  - `created_at`
  - `last_seen_at`
- `messages`
  - `id`
  - `type`
  - `text_content`
  - `device_id`
  - `created_at`
- `attachments`
  - `id`
  - `message_id`
  - `original_name`
  - `mime_type`
  - `size`
  - `storage_path`
  - `created_at`
- `app_config`
  - `id`
  - `password_hash`
  - `created_at`
  - `updated_at`

## Current Runtime Model

- 根命令 `pnpm dev` 会同时启动前端和后端
- 这不是单进程应用，而是两个进程并行启动：
  - Web: Next.js
  - Server: NestJS
- 当前默认端口：
  - Web: `3000`
  - Server: `4000`

## Current Timeline Behavior

- `GET /timeline`
  - 默认只返回最近一页消息
  - 默认页大小是 `50`
  - 返回顺序仍然是消息 `id` 升序
- `GET /timeline?before=<id>&limit=<n>`
  - 返回 `<id>` 之前的更旧消息
  - Web 聊天页用它做顶部“加载更早消息”
- `GET /timeline?after=<id>`
  - 保留原有增量同步语义
  - 只返回比 `<id>` 更新的消息
- timeline 响应现在包含：
  - `items`
  - `nextCursor`
  - `hasMore`

## Current Environment Files

- 后端环境文件：
  - [apps/server/.env](/D:/project/SendToSelf/apps/server/.env)
  - [apps/server/.env.example](/D:/project/SendToSelf/apps/server/.env.example)
- 前端环境文件：
  - [apps/web/.env.local](/D:/project/SendToSelf/apps/web/.env.local)
  - [apps/web/.env.example](/D:/project/SendToSelf/apps/web/.env.example)

当前 Web 代理模式下，如果本机局域网 IP 变化，通常只需要更新 `apps/web/.env.local` 里的 `NEXT_PUBLIC_APP_ORIGIN`。`SERVER_INTERNAL_API_BASE_URL` 一般保持 `http://localhost:4000` 即可。

当前与远程客户端相关的后端配置语义是：

- `INSTANCE_NAME`
  - 返回给 `GET /client/bootstrap`，作为实例显示名
- `REMOTE_CLIENT_ENABLED`
  - 控制实例是否开放远程客户端 Bearer 接入
- `REMOTE_CLIENT_ALLOWED_ORIGINS`
  - 控制远程浏览器客户端允许跨域访问 `:4000` 的 origin 列表
  - 支持逗号分隔
  - 显式设为空字符串时，不允许任何跨域浏览器 origin

## Important Current Constraint

当前 Web 已经完成“统一走 `/api` 代理后端”的重构。

当前真实状态是：

- 浏览器统一请求同源 `/api/...`
- 统一封装在 [apps/web/lib/api.ts](/D:/project/SendToSelf/apps/web/lib/api.ts)
- 由 [apps/web/next.config.ts](/D:/project/SendToSelf/apps/web/next.config.ts) 把 `/api/*` 代理到 `SERVER_INTERNAL_API_BASE_URL`

这次改造对长期目标的意义是：

- 每个后端实例自带一个 Web 客户端
- Web 默认跟同实例后端通信
- 移动端、桌面端以后再通过配置服务器地址连接实例

当前认证在这个结构上的分工是：

- Web 继续使用同源 cookie，因为它本来就跟实例内建前端绑定
- 其他客户端直接使用 Bearer token 访问后端，不需要复用浏览器 cookie 语义
- `GET /client/bootstrap` 提供未来远程客户端首次连接实例时需要的最小只读信息
- 认证接口与 CORS 的完整说明见：
  - [API.md](/D:/project/SendToSelf/API.md)

## In Progress / Next High-Priority Task

当前已经完成“为未来远程客户端做最小准备”的后端收口。如果你是新的接手者，建议优先确认下面几个关键点：

- [apps/server/src/client/client.controller.ts](/D:/project/SendToSelf/apps/server/src/client/client.controller.ts)
- [apps/server/src/client/client-config.service.ts](/D:/project/SendToSelf/apps/server/src/client/client-config.service.ts)
- [apps/server/src/auth/guards/session-auth.guard.ts](/D:/project/SendToSelf/apps/server/src/auth/guards/session-auth.guard.ts)
- [apps/server/src/main.ts](/D:/project/SendToSelf/apps/server/src/main.ts)
- README 是否已经同步更新

## Known Validation Status

当前已验证通过：

- `pnpm --filter server lint`
- `pnpm --filter server build`
- `pnpm --filter server test:e2e`
- `pnpm --filter web lint`
- `pnpm --filter web build`

当前 `apps/server/test/app.e2e-spec.ts` 已覆盖：

- 远程访问关闭时 `POST /auth/token` 返回 `403`
- 远程访问关闭时 Bearer 无法访问受保护接口
- `GET /client/bootstrap` 的远程访问信息
- 附件下载仍挂在统一认证 guard 后面
- cookie / bearer / logout revoke 链路

## Local Development Notes

- 数据库使用 PostgreSQL
- 当前机器上的 `psql` 未加入 PATH，README 里使用绝对路径：
  - `C:\Program Files\PostgreSQL\18\bin\psql.exe`
- 开发环境没有 Docker 依赖
- 文件上传目录是 `apps/server/uploads`

## Important Non-Goal Reminders

除非任务明确要求，否则不要新增以下能力：

- WebSocket
- 实时推送
- 多用户
- 团队协作
- 搜索增强
- 文件夹 / 标签 / 收藏
- 富文本
- 复杂权限系统
- 对象存储

## Suggested First Read Order For New AI

1. [CURRENT.md](/D:/project/SendToSelf/CURRENT.md)
2. [API.md](/D:/project/SendToSelf/API.md)
3. [README.md](/D:/project/SendToSelf/README.md)
4. [apps/server/src/app.module.ts](/D:/project/SendToSelf/apps/server/src/app.module.ts)
5. [apps/server/src/main.ts](/D:/project/SendToSelf/apps/server/src/main.ts)
6. [apps/web/lib/api.ts](/D:/project/SendToSelf/apps/web/lib/api.ts)

## Notes About Local Artifacts

仓库当前可能存在本地产物目录，例如：

- `apps/web/.next`
- `apps/server/dist`
- `apps/server/uploads`

这些目录不代表产品结构演进，只是本地开发或测试痕迹。做功能判断时应优先看源码与 migration，而不是这些产物目录。
