# Deployment

本文档说明当前项目的 Docker Compose 部署方式。

## Runtime Layout

部署后的实例包含 3 个容器：

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

## Environment

默认情况下不需要准备 `.env`。

首次启动时，Compose 会额外运行一个一次性 `config` 容器：

- 自动生成高熵随机 `POSTGRES_PASSWORD`
- 自动生成高熵随机 `JWT_SECRET`
- 把运行期配置写入持久化卷，供 `postgres` 和 `server` 复用

如果需要覆盖默认值，再在仓库根目录创建 `.env`：

```powershell
Copy-Item .env.example .env
```

可覆盖的常用项如下：

```env
POSTGRES_DB=send_to_self
POSTGRES_USER=postgres
INSTANCE_NAME=Send to Self
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
```

说明：

- `NEXT_PUBLIC_APP_ORIGIN` 应设置为用户实际访问 Web 的公开地址
- 如果只是在本机访问 `http://localhost:3000`，默认值可以直接使用

## Start

在仓库根目录执行：

```powershell
docker compose up -d --build
```

启动后：

- 浏览器访问 `http://localhost:3000`
- 首次进入实例时先完成 `/setup`
- 设置成功后进入 `/auth/login`

## Network Model

- 宿主机只暴露 `3000`
- `server:4000` 只供 `web` 和 `postgres` 所在容器网络使用
- 浏览器统一访问 `web`，不直接请求服务端端口

## Persistence

Compose 会创建两个命名卷：

- `runtime-config`
  - 保存自动生成的数据库密码和 JWT 密钥
- `postgres-data`
  - 保存 PostgreSQL 数据
- `server-uploads`
  - 保存附件文件

备份时需要同时备份 `runtime-config`、数据库卷和附件卷。

## Upgrade

更新代码后，在仓库根目录重新执行：

```powershell
docker compose up -d --build
```

`server` 容器会在启动前自动执行迁移，然后再启动应用进程。

## Build Cache

当前 Compose 仍然使用源码本地构建，但构建层做了两点优化：

- `web` 和 `server` 的 pnpm 依赖安装层使用相同的前置输入，便于复用同一组缓存层
- `pnpm install` 使用 BuildKit cache mount 复用 pnpm store，减少重复下载

这意味着：

- 只改应用源码、没有改 `pnpm-lock.yaml` 或工作区 `package.json` 时，重复构建通常会直接复用依赖层
- 只有依赖清单变化时，依赖安装层才会重新执行

## Common Commands

- `docker compose up -d`
  - 使用现有镜像启动或重启容器，适合镜像已经构建好、只想拉起当前环境
- `docker compose up -d --build`
  - 先按当前源码重新构建，再后台启动容器，适合改了 Dockerfile、依赖清单或应用源码之后使用
- `docker compose build web`
  - 只重建 `web` 镜像，适合只验证前端构建
- `docker compose build server`
  - 只重建 `server` 镜像，适合只验证服务端构建

## Reverse Proxy

如需通过域名或 HTTPS 暴露服务，建议把反向代理接到 `web:3000`。

`web` 已负责把同源 `/api/*` 转发到内部 `server`，因此外部代理只需要处理 Web 入口。
