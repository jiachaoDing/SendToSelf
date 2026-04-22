# Deployment

本文档说明当前项目的 Docker Compose 部署方式。

## Runtime Layout

部署后的实例包含 4 个服务：

- `config`
  - 一次性初始化运行期配置
  - 把生成的密钥和数据库密码写入 `runtime-config` 卷

- `web`
  - 对外提供 `3000` 端口
  - 承载内建 Web
  - 统一把同源 `/api/*` 转发到 `server`
- `server`
  - 只在容器网络内监听 `4000`
  - 启动前自动执行数据库迁移
  - 使用本地磁盘目录保存附件
- `postgres`
  - 保存业务数据

## User Deployment

在仓库根目录执行：

```powershell
docker compose pull
docker compose up -d
```

这套默认 Compose 面向普通用户，直接拉取并运行预构建镜像，不需要先复制 `.env.example`。

启动后：

- 浏览器访问 `http://localhost:3000`
- 首次进入实例时先完成 `/setup`
- 设置成功后进入 `/auth/login`

如果需要修改宿主机访问端口，直接编辑根目录 `docker-compose.yml` 里 `web` 服务的 `ports`，把左侧宿主机端口改成你想要的值，例如：

```yaml
ports:
  - "8080:3000"
```

保存后重新执行：

```powershell
docker compose up -d
```

## Optional Configuration

默认情况下不需要准备 `.env`。

首次启动时，Compose 会额外运行一个一次性 `config` 容器：

- 自动生成高熵随机 `POSTGRES_PASSWORD`
- 自动生成高熵随机 `JWT_SECRET`
- 把运行期配置写入持久化卷，供 `postgres` 和 `server` 复用

如需覆盖公开访问地址、实例名、数据库默认名、数据库默认用户，或固定镜像版本，再在仓库根目录创建 `.env`：

```powershell
Copy-Item .env.example .env
```

`.env.example` 提供这些可选覆盖项：

```env
POSTGRES_DB=send_to_self
POSTGRES_USER=postgres
INSTANCE_NAME=Send to Self
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
```

说明：

- `NEXT_PUBLIC_APP_ORIGIN` 会在 `web` 容器启动时写入 `/runtime-config.js`
- 浏览器只读取 `NEXT_PUBLIC_APP_ORIGIN`
- `SERVER_INTERNAL_API_BASE_URL` 只供 `web` 容器内部把同源 `/api/*` 转发到 `server`
- 默认镜像地址固定为 `ghcr.io/jiachaoding/sendtoself-*`
- 如需固定镜像版本，可在根目录 `.env` 里额外设置 `IMAGE_TAG=v0.1.0`

如果只修改 `.env` 里的 `NEXT_PUBLIC_APP_ORIGIN`，不需要重新 build 镜像，执行：

```powershell
docker compose up -d --force-recreate web
```

## Developer Deployment

开发者如需按当前仓库源码本地构建，执行：

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

`docker-compose.dev.yml` 会覆盖四个服务的镜像来源，使 `config`、`postgres`、`server`、`web` 都改为本地 `build:`。

## Network Model

- 宿主机只暴露 `3000`
- `server:4000` 只供 `web` 和 `postgres` 所在容器网络使用
- 浏览器统一访问 `web`，不直接请求服务端端口

## Persistence

Compose 会创建三个命名卷：

- `runtime-config`
  - 保存自动生成的数据库密码和 JWT 密钥
- `postgres-data`
  - 保存 PostgreSQL 数据
- `server-uploads`
  - 保存附件文件

备份时需要同时备份 `runtime-config`、数据库卷和附件卷。

## Upgrade

普通用户更新镜像后，在仓库根目录执行：

```powershell
docker compose pull
docker compose up -d
```

`server` 容器会在启动前自动执行迁移，然后再启动应用进程。

如果只是修改公开访问地址，不需要 `--build`，只需要重建 `web` 容器即可。

## Build Cache

开发版 Compose 的本地源码构建做了两点优化：

- `config`、`postgres`、`server` 所需的启动脚本会在构建阶段复制到镜像内
- `web` 和 `server` 的 pnpm 依赖安装层使用相同的前置输入，便于复用同一组缓存层
- `pnpm install` 使用 BuildKit cache mount 复用 pnpm store，减少重复下载

这意味着：

- 只改应用源码、没有改 `pnpm-lock.yaml` 或工作区 `package.json` 时，重复执行开发版 compose 构建通常会直接复用依赖层
- 只有依赖清单变化时，依赖安装层才会重新执行

## Common Commands

- `docker compose pull`
  - 拉取默认 Compose 里定义的四个预构建镜像，适合首次部署或准备升级时使用
- `docker compose up -d`
  - 使用已拉取的镜像启动或重启容器，适合普通用户日常部署，也适合在修改 `web` 的 `ports` 后重新应用配置
- `docker compose up -d --force-recreate web`
  - 按新的运行时环境重建 `web` 容器，适合只修改 `NEXT_PUBLIC_APP_ORIGIN`
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`
  - 叠加开发版 compose，按当前仓库源码重新构建并启动四个服务

## Reverse Proxy

如需通过域名或 HTTPS 暴露服务，建议把反向代理接到 `web:3000`。

`web` 已负责把同源 `/api/*` 转发到内部 `server`，因此外部代理只需要处理 Web 入口。
