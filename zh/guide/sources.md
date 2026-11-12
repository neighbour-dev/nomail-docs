---
title: NoMail 平台接入指南 - 连接 Webhook 通知来源
description: 准备 NoMail 接收地址、来源平台权限与验证凭据，完成两侧 Webhook 配置、事件订阅和测试投递，并排查通知未送达的常见问题。
---

# 连接 Webhook 通知来源

NoMail 通过 Webhook 接收来源平台的事件。接入时，需要在 NoMail 和来源平台两侧完成配置，而不是只填一个平台名称。

## 接入前准备

- 已完成[服务端部署](install.md)，并准备好来源平台能够访问的服务地址。公网部署应使用 HTTPS。
- 拥有来源平台中配置 Webhook 或事件订阅所需的权限。
- 准备对应平台的接收凭据，用于验证通知来源。接收凭据不一定是平台的 API Token，不能混用。

## 接入流程

1. 在 NoMail 中为来源建立接收配置，设置名称、平台及对应凭据。
2. 将 NoMail 的接收地址填写到来源平台的 Webhook 或事件订阅设置中。
3. 按平台要求填写相同的凭据、选择需要的事件，并启用订阅。
4. 使用来源平台的测试投递或触发一次事件，检查投递结果及 NoMail 中的消息。

创建 NoMail 接收配置不会自动创建来源平台的订阅。部分平台还会验证接收地址，需要先完成验证再接收正式事件。

## 各平台需要的凭据

下表描述最新正式版服务端的支持范围，不保证每个已发布 App 版本的表单都包含全部平台。客户端缺少对应平台时，请使用兼容客户端，或按[最新版 OpenAPI 附件](https://github.com/neighbour-dev/nomail-api/releases/latest/download/swagger.json)调用接收配置接口。

| 来源 | 接收凭据 | 注意事项 |
|---|---|---|
| Generic | 可选择无认证或 HMAC 密钥 | 公网使用建议启用认证 |
| [GitHub](../reference/platforms/github.md) | Webhook Secret | 不是个人访问令牌 |
| [Gitea](../reference/platforms/gitea.md) | Webhook Secret | 选择独立 Gitea 平台，不使用 GitHub 兼容模式 |
| [App Store Connect](../reference/platforms/app-store-connect.md) | 独立 Webhook Secret | 不是 API 私钥或内购通知密钥；不支持内购/订阅 JWS 通知 |
| [GitLab](../reference/platforms/gitlab.md) | Signing Token 或旧式 Secret Token | 按实例支持的方式配置，两种方式不可混用 |
| [Stripe](../reference/platforms/stripe.md) | 端点 Signing Secret | 测试与正式环境、不同端点的密钥不能混用 |
| [Slack](../reference/platforms/slack.md) | 应用 Signing Secret | 不是 Bot Token |
| [飞书](../reference/platforms/feishu.md) | Verification Token、可选 Encrypt Key | 启用加密时，两侧必须配置相同 Encrypt Key |
| [Telegram](../reference/platforms/telegram.md) | Webhook Secret Token | 不是 Bot Token |
| [Shopify](../reference/platforms/shopify.md) | 应用 Client Secret | 不是店铺访问令牌 |

请妥善保存原始凭据，NoMail 不会通过查询配置回显秘密值。服务端加密密钥的配置统一见[安装与部署](install.md#配置加密密钥)。

## 没有收到消息时

- 检查来源平台是否启用了订阅，以及是否选中了对应事件。
- 检查接收地址是否完整、公网可达，反向代理是否正确转发。
- 检查平台凭据是否对应当前应用、端点和环境。
- 在来源平台查看投递结果，区分地址验证、认证失败和事件处理问题。

需要核对签名、请求头或事件结构时，可查阅[平台协议参考](../reference/webhook-platform-reference-2026-10-30.md)。上游协议中的交互业务响应、出站 API 调用等能力，不代表 NoMail 均已实现。
