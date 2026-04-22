# Send to Self

一个单用户、自托管、聊天界面的个人收件箱。

它用来做一件很简单的事：把文本、链接、图片或文件快速发给自己，并在不同设备上继续查看。

## What It Does

- 用聊天时间线统一保存自己发过的内容
- 支持文本、链接、图片和普通文件
- 适合自托管、个人使用、轻量跨设备同步
- 首次访问通过 `/setup` 设置单用户主密码
- 当前前端只有 Built-in Web

## Current Status

当前是 MVP，已经提供可运行的 Web + server 版本，重点放在核心收件箱体验，而不是完整 IM 功能。

目前已经实现的是实例内建的 Web 前端。远程客户端接入能力仍在规划中，暂时还没有独立的远程 Web / 移动端 / 桌面端客户端。

## Quick Start

准备好 `Node.js`、`pnpm` 和 `PostgreSQL` 后，在仓库根目录执行：

```powershell
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

启动后首次访问 Web 时，先打开 `/setup` 设置主密码，再进入 `/auth/login` 为当前设备登录。

详细配置见 [`docs/development.md`](docs/development.md)。

## Screenshots

|                            登录页                            |                            发送页                            |
| :----------------------------------------------------------: | :----------------------------------------------------------: |
| <img src="https://image.webutilitykit.com/images/2026/04/17/20260417-231537-6b632ac2.webp" alt="image-20260417231537102" style="zoom: 50%;" /> | <img src="https://image.webutilitykit.com/images/2026/04/17/20260417-231454-8554e875.webp" alt="image-20260417231451534" style="zoom:50%;" /> |



## Roadmap

- 更好的移动端体验
- 更稳定的附件能力
- 更清晰的自托管部署方式
- 更完整的远程客户端接入

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
