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



VitePress 初始化的 `api-examples.md` 和 `markdown-examples.md` 暂时保留作编辑参考，不列入正式导航。

## 许可证

除另有明确声明的第三方内容外，本仓库的文档和站点源码采用 **GNU Affero General Public License v3.0（`AGPL-3.0-only`）**，完整条款见仓库根目录的 [LICENSE](./LICENSE)。
