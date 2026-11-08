# HTTP 接口定义

NoMail API 的 HTTP 契约使用 OpenAPI 3.1 描述，Server 与 Cloudflare Workers 共用同一套接口。

- [查看 OpenAPI 文件](https://github.com/neighbour-dev/nomail-api/blob/main/docs/swagger.json)
- [下载原始 JSON](https://raw.githubusercontent.com/neighbour-dev/nomail-api/main/docs/swagger.json)
- [消息游标查询](message-cursor.md)
- [平台 Webhook 协议参考](webhook-platform-reference-2026-10-30.md)

`swagger.json` 由后端真实 DTO 和路由契约生成，继续保留在 `nomail-api/docs/`，供测试校验与接口工具导入；文档站不维护手写副本。使用已发布版本时，请切换到对应标签的接口定义，不要直接将主分支契约视为已部署版本。

## 更新接口定义

在 `nomail-api` 仓库根目录运行：

```bash
cargo run --locked -p nomail-app --features openapi --example export-openapi -- docs/swagger.json
cargo test --locked -p nomail-app --features openapi --lib
```

开发检查及贡献流程见后端的[贡献指南](https://github.com/neighbour-dev/nomail-api/blob/main/CONTRIBUTING.md)。
