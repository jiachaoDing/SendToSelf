# Current State

本文档面向后续维护者，记录当前仓库现状，避免把阶段性实现细节继续堆在首页 README。

## Project Summary

- 项目名：Send to Self / 发给自己
- 产品定义：单用户、自托管、聊天界面的个人多端同步收件箱
- 当前阶段：后端 + Web 前端的最小可运行版本
- 明确不做：多人、群聊、实时推送、标签、文件夹、收藏、复杂 auth、原生移动端和桌面端实现

## Implemented Today

- 已初始化 monorepo，根命令由 `package.json` 管理
- 后端已搭好：
  - NestJS modular monolith
  - Drizzle ORM + PostgreSQL
  - schema 与 migration
  - 文件上传到本地磁盘
  - 附件下载/图片访问
  - 单用户主密码初始化
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
  - 最小 PWA 接入
  - 浏览器安装到主屏 / 桌面
  - 独立窗口启动
  - 基础离线应用壳

需要注意：

- 当前真正实现的前端只有实例内建的 Web
- 远程客户端相关接口和配置已经预留，但还没有独立客户端实现

## Current Runtime Model

- 根命令 `pnpm dev` 会同时启动前端和后端
- 当前是两个进程并行启动：
  - Web: Next.js
  - Server: NestJS
- 默认端口：
  - Web: `3000`
  - Server: `4000`

## Current API Surface

接口清单、认证与 CORS 语义统一维护在：

- [`../reference/api.md`](../reference/api.md)

## Current Auth Model

- 实例首次使用时通过 `/setup` 设置一次主密码
- 主密码只以 `bcrypt` 哈希形式存储在 `app_config.password_hash`
- `app_config` 有记录即视为已初始化，没有记录即视为未初始化
- 后端认证本体是 JWT token，payload 包含 `deviceId` 与 `authVersion`
- 内建 Web 使用 cookie，远程客户端使用 bearer
- `REMOTE_CLIENT_ENABLED=false` 时，实例只保留内建 Web cookie 链路
- 每个设备有独立的 `authVersion`
- `POST /auth/logout` 会清 cookie，并尝试把当前设备的 `authVersion` 加一，使当前设备旧 token 失效

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

## Important Current Constraint

当前 Web 已经完成“统一走 `/api` 代理后端”的重构：

- 浏览器统一请求同源 `/api/...`
- 请求统一封装在 `apps/web/lib/api.ts`
- 由 `apps/web/next.config.ts` 把 `/api/*` 代理到 `SERVER_INTERNAL_API_BASE_URL`

当前结构的含义：

- 每个后端实例自带一个 Web 客户端
- Web 默认跟同实例后端通信
- 其他客户端以后再通过配置服务器地址连接实例

## Known Validation Status

当前已验证通过：

- `pnpm --filter server lint`
- `pnpm --filter server build`
- `pnpm --filter server test:e2e`
- `pnpm --filter web lint`
- `pnpm --filter web build`

## Important Non-Goals

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
