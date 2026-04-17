# Contributing

感谢关注这个项目。

## Before You Start

当前项目仍处在 MVP 阶段。提交改动前，请先确认你的改动是否直接服务于当前目标：

- 让“给自己发文本、链接、图片、文件”这条主链路更稳定
- 让 Web / server 的自托管体验更清晰
- 改进已有能力，而不是扩展过多新范围

当前默认不优先引入：

- 多用户
- 团队协作
- WebSocket / 实时推送
- 标签、收藏、复杂组织系统
- 复杂权限系统

## Local Setup

参考 [`docs/development.md`](docs/development.md) 完成本地环境准备和启动。

## Validation

提交前建议至少执行：

```powershell
pnpm --filter web lint
pnpm --filter web build
pnpm --filter server lint
pnpm --filter server build
pnpm --filter server test:e2e
```

## Pull Requests

提交 PR 时请尽量做到：

- 说明改动解决了什么问题
- 保持改动范围聚焦
- 不混入无关重构
- 如果改动影响用户使用或部署方式，同步更新相关文档

## Issues

欢迎提交 bug report 或功能建议。

提 issue 时请尽量提供：

- 复现步骤
- 预期行为
- 实际行为
- 运行环境
- 相关日志或截图
