# Send to Self

<p align="center">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-web-000000?logo=nextdotjs&logoColor=white">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-api-E0234E?logo=nestjs&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-storage-4169E1?logo=postgresql&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green">
</p>

Send to Self 是一个给个人使用的自托管收件箱。你可以把文字、链接、图片和文件发送给自己，然后在不同设备上通过一个简单的聊天式时间线继续阅读和整理。

## 项目定位

Send to Self 适合这些场景：

- 在手机、电脑、平板之间快速暂存链接、笔记、截图和文件
- 搭建只给自己使用的轻量收件箱
- 用自己的服务器保存数据，而不是依赖第三方聊天工具或云笔记

它不是团队聊天工具，也不追求复杂协作功能。项目范围刻意保持很窄：单用户、自托管、Web 优先、专注捕获。

## 功能

- 发送纯文本和链接
- 上传图片和普通文件
- 在同一个时间线中查看所有内容
- 登录后跨设备继续使用
- 首次运行时设置实例密码
- 默认 Docker Compose 部署，包含 PostgreSQL、API 服务和 Web 应用

## 快速开始

确保本机已经安装 Docker 和 Docker Compose，然后在项目根目录运行：

```powershell
docker compose pull
docker compose up -d
```

启动后打开：

```text
http://localhost:3000
```

首次访问时按顺序完成初始化：

1. 打开 `http://localhost:3000/setup`，设置实例密码。
2. 打开 `http://localhost:3000/auth/login`，在当前设备登录。
3. 登录后进入时间线，开始发送文字、链接、图片或文件。

默认部署会启动三个服务：

- `postgres`：保存应用数据
- `server`：提供 API 和上传能力
- `web`：提供内置 Web 应用

## 配置

默认配置不需要 `.env` 文件即可运行。需要覆盖运行参数时，可以复制示例文件：

```powershell
Copy-Item .env.example .env
```

可配置项：

```env
POSTGRES_DB=send_to_self
POSTGRES_USER=postgres
INSTANCE_NAME=Send to Self
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
```

默认只有 Web 服务暴露到宿主机：

```yaml
ports:
  - "3000:3000"
```

如果要改宿主机端口，修改 `docker-compose.yml` 中左侧端口后重新启动：

```powershell
docker compose up -d
```

更完整的部署说明见 [docs/deployment.md](docs/deployment.md)。

## 数据持久化

Docker Compose 会创建三个命名卷：

- `runtime-config`：运行时生成的密钥和数据库设置
- `postgres-data`：PostgreSQL 数据
- `server-uploads`：上传的文件

如果要备份或迁移实例，请同时备份这三个卷。

## 本地开发

本仓库是 pnpm workspace，包含两个应用：

- `apps/web`：Next.js Web 客户端
- `apps/server`：NestJS API 服务

安装依赖：

```powershell
corepack pnpm install
```

复制本地环境变量：

```powershell
Copy-Item apps/server/.env.example apps/server/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

准备数据库并运行迁移：

```powershell
corepack pnpm db:generate
corepack pnpm db:migrate
```

启动开发服务：

```powershell
corepack pnpm dev
```

默认本地地址：

- Web：`http://localhost:3000`
- Server：`http://localhost:4000`

更多开发和验证步骤见 [docs/development.md](docs/development.md)。

## 常用验证

根据改动范围选择最小验证命令：

```powershell
corepack pnpm --filter web build
corepack pnpm --filter server build
corepack pnpm --filter server test:e2e
```

最小手动检查：

- 首次设置密码后可以跳转到登录
- 登录后可以进入时间线
- 发送文字或链接后可以看到新消息
- 上传图片或文件后可以看到附件消息

## 文档

- 部署说明：[docs/deployment.md](docs/deployment.md)
- 开发说明：[docs/development.md](docs/development.md)
- API 参考：[docs/reference/api.md](docs/reference/api.md)
- 贡献指南：[CONTRIBUTING.md](CONTRIBUTING.md)
- 安全政策：[SECURITY.md](SECURITY.md)

## 许可证

本项目使用 [MIT](LICENSE) 许可证。
