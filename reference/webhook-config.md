# Webhook 配置接口

本文面向开发者，说明接收配置的 HTTP 契约。日常接入流程请阅读[连接通知来源](../guide/sources.md)。

配置管理接口要求 `Authorization: Bearer <accessToken>`。例如创建飞书加密接收配置：

```http
POST /api/webhook/configs
Content-Type: application/json
Authorization: Bearer <accessToken>
```

```json
{
  "name": "Feishu events",
  "description": "Work notifications",
  "platform": {
    "provider": "feishu",
    "credentials": {
      "verificationToken": "example-verification-token",
      "encryptKey": "example-encryption-key"
    }
  }
}
```

`name` 必填，1–100 字符；`description` 可省略，最多 500 字符；创建时默认启用。平台及认证模式使用下表的精确大小写，不接受未知字段或位置数组。通用秘密字段要求非空白且最多 500 字符，这是接收端的限制，不是上游平台统一规定。

| provider | credentials 示例 | 约束 |
|---|---|---|
| `generic` | `{"type":"none"}` 或 `{"type":"hmacSha256","secret":"example-secret"}` | 仅 Generic 允许显式无认证；none 不接受 secret |
| `github` | `{"secret":"example-secret"}` | 必须配置与 GitHub Webhook 一致的 Secret |
| `gitlab` | `{"type":"signingToken","signingToken":"whsec_ZXhhbXBsZS1rZXk="}` 或 `{"type":"secretToken","secretToken":"example-token"}` | 两种模式互斥；Signing Token 去前缀后须为非空 Base64 密钥，不能因签名缺失回退旧 Token |
| `stripe` | `{"signingSecrets":["whsec_example"]}` | 接收端允许 1–5 个密钥用于轮换；使用端点/环境对应的密钥原文，不采用 GitLab 的解码方式；轮换完成后主动移除旧密钥 |
| `slack` | `{"signingSecret":"example-secret"}` | 不是 Bot Token、Client Secret 或旧 Verification Token |
| `feishu` | `{"verificationToken":"example-token","encryptKey":"example-key"}` | 两个独立值；省略 encryptKey 或设为 null 表示仅 Token 模式，非空 Encrypt Key 启用加密事件模式 |
| `telegram` | `{"secretToken":"example_token"}` | 1–256 字符，只允许英文字母、数字、下划线和短横线；不是 Bot Token |
| `shopify` | `{"clientSecret":"example-secret"}` | 应用 Client Secret，不是店铺 Admin API Access Token |

平台配置使用严格的 `platform.provider` + `platform.credentials`，不接受旧顶层 `provider`、`secret` 或配置 `source`。

平台配置整体加密存储，响应只返回安全摘要，例如 `platform: {"provider":"feishu","authentication":"feishuEncrypted"}`，不会回显 credentials 或秘密值。响应还包含 id、name、key、enabled、description 和相对 url。请在安全的外部凭据管理中保存原值，不要依赖查询接口找回。将相对 url 拼接到服务公开地址后，才是平台侧需要填写的完整接收地址。

`PATCH /api/webhook/configs/{id}` 中省略字段表示保留；`{}` 不写库、不改变更新时间。传入 `platform` 时必须提供完整的新平台配置并整体替换，不能只传 provider 或单个秘密字段。顶层字段不接受 null；description 可以用 `""` 清除，name 不允许空字符串。切换平台会影响后续接收，不会重写已有消息的平台快照，接收 key 保持不变；切换 Telegram Bot 应创建新配置以隔离去重作用域。

启停使用 `PATCH /api/webhook/configs/{id}/enabled` 和 `{"enabled":false}`；删除为软删除。平台事件自带的消息 source 保留，缺少时用平台名兜底，不从接收配置取默认来源。

完整定义见 [OpenAPI](openapi.md)。
