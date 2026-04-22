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
docker compose pull
docker compose up -d
```

2. 打开 `http://localhost:3000`。

启动后首次访问 Web 时，先打开 `/setup` 设置主密码，再进入 `/auth/login` 为当前设备登录。

默认 Compose 会启动 `postgres`、`server`、`web` 三个服务，并创建 `runtime-config`、`postgres-data`、`server-uploads` 三个命名卷。

如果需要修改宿主机访问端口，直接编辑根目录 `docker-compose.yml` 里 `web` 服务的 `ports`，把左侧宿主机端口改成你想要的值，例如 `"8080:3000"`。

保存后重新执行：

```powershell
docker compose up -d
```

如需固定镜像版本或覆盖公开访问地址等高级配置，再参考 `.env.example` 和 [`docs/deployment.md`](docs/deployment.md)。

部署细节见 [`docs/deployment.md`](docs/deployment.md)，本地开发见 [`docs/development.md`](docs/development.md)。

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
