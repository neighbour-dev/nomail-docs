# NoMail 文档

本仓库集中维护 NoMail 的产品使用、自托管部署和平台接入文档。NoMail 由 App 和可自托管的服务端组成，文档以用户完成实际任务为主线，而不是以调用后端接口为主线。

## 本地预览

```bash
pnpm install
pnpm docs:dev
```

构建检查：`pnpm docs:build`。

## 文档边界

| 目录 | 内容 |
|---|---|
| `guide/` | 产品介绍、安装部署、平台接入与密钥管理 |
| `reference/` | 面向开发者的接口细节、平台协议及 OpenAPI 入口 |
| `research/` | 产品与竞品研究，不代表已实现功能 |
| `archive/` | 历史分析，仅作背景参考，不作为当前接口契约 |

后端的贡献指南、发布规范、更新日志、crate 架构说明和自动生成的 `docs/swagger.json` 留在 `nomail-api`，随代码维护。迁入的文档原文来自 [nomail-api](https://github.com/neighbour-dev/nomail-api)，继续适用其[原有许可](https://github.com/neighbour-dev/nomail-api/blob/main/LICENSE)，本次迁移不变更授权。

VitePress 初始化的 `api-examples.md` 和 `markdown-examples.md` 暂时保留作编辑参考，不列入正式导航。
