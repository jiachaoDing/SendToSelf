# Send to Self

一个单用户、自托管、聊天界面的个人收件箱。

它用来做一件很简单的事：把文本、链接、图片或文件快速发给自己，并在不同设备上继续查看。

## What It Does

- 用聊天时间线统一保存自己发过的内容
- 支持文本、链接、图片和普通文件
- 适合自托管、个人使用、轻量跨设备同步
- 首次访问通过 `/setup` 设置单用户主密码
- 通过实例内建 Web 使用

## Current Status

当前是 MVP，已经提供可运行的 Web + server 版本，重点放在核心收件箱体验，而不是完整 IM 功能。

## Quick Start

1. 在仓库根目录启动：

```powershell
docker compose up -d --build
```

2. 打开 `http://localhost:3000`。

启动后首次访问 Web 时，先打开 `/setup` 设置主密码，再进入 `/auth/login` 为当前设备登录。

如果需要修改实例名、数据库名、数据库用户或公开访问地址，再从 `.env.example` 复制出 `.env` 覆盖默认值。

`NEXT_PUBLIC_APP_ORIGIN` 现在在 `web` 容器启动时生效。只修改公开访问地址时，不需要重新 build 镜像，执行：

```powershell
docker compose up -d --force-recreate web
```

部署细节见 [`docs/deployment.md`](docs/deployment.md)，本地开发见 [`docs/development.md`](docs/development.md)。

Docker 本地源码构建已针对 pnpm monorepo 做缓存优化：

- `pnpm install` 只会在 `pnpm-lock.yaml` 或相关 `package.json` 变化后重建依赖层
- 重复执行 `docker compose up -d --build` 时，会复用 Docker BuildKit 和 pnpm store 缓存
- 只改应用源码但不改依赖时，建议继续使用 `docker compose up -d --build` 重新构建当前代码

## Screenshots

|                            登录页                            |                            发送页                            |
| :----------------------------------------------------------: | :----------------------------------------------------------: |
| <img src="https://image.webutilitykit.com/images/2026/04/17/20260417-231537-6b632ac2.webp" alt="image-20260417231537102" style="zoom: 50%;" /> | <img src="https://image.webutilitykit.com/images/2026/04/17/20260417-231454-8554e875.webp" alt="image-20260417231451534" style="zoom:50%;" /> |



## Roadmap

- 更好的移动端体验
- 更稳定的附件能力
- 更清晰的自托管部署方式
- 更顺手的升级与备份体验

## Docs

- 开发说明：[`docs/development.md`](docs/development.md)
- 部署说明：[`docs/deployment.md`](docs/deployment.md)
- API 说明：[`docs/reference/api.md`](docs/reference/api.md)

## Contributing

贡献方式见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## Security

安全问题请按 [`SECURITY.md`](SECURITY.md) 中的方式报告。

## License

本项目使用 [`MIT`](LICENSE) 协议。
