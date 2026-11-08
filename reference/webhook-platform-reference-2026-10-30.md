---
title: 平台 Webhook 鉴权、请求体与响应协议索引 | NoMail
description: 对照 GitHub、GitLab、Stripe、Slack、飞书、Telegram、Shopify、Gitea 和 App Store Connect 的 Webhook 编码、鉴权方式、响应时限与专用回调。
---

# 平台 Webhook 协议索引

| 项目 | 范围 |
|---|---|
| 用途 | 指导服务端协议实现及 App 平台配置/事件展示 |
| 核对日期 | 2026-11-08 |
| 产品实现状态 | 不在本模块讨论范围 |
| 覆盖 | 平台主动发往接收端的 HTTP 通知、地址验证、交互回调、测试投递 |
| 排除 | WebSocket、事件总线封装、向机器人地址发送消息的 Incoming Webhook |
| 规范约定 | [字段必填性、来源等级与算法符号](webhook-contract-conventions.md) |

## 平台索引

| 平台 | 请求识别位置 | Body 编码 | 认证契约 | 专用响应 |
|---|---|---|---|---|
| [GitHub](platforms/github.md) | X-GitHub-Event、Body.action | JSON / payload 表单 | Secret + HMAC-SHA256；历史 SHA1 | Ping 只确认，不回显 challenge |
| [GitLab](platforms/gitlab.md) | X-Gitlab-Event、Body 中的事件字段 | JSON / 自定义 JSON 模板 | Standard Webhooks HMAC / 固定 Secret Token | Test 沿用所选事件结构 |
| [Stripe](platforms/stripe.md) | Body.type、端点 Payload 格式 | Snapshot / Thin JSON | 带时间戳 HMAC-SHA256 | Issuing 同步授权决策 |
| [Slack](platforms/slack.md) | 外层 type、event.type、payload.type、command | JSON / payload 表单 / 直接表单 | 带时间戳 HMAC-SHA256；SSL 探测单列 | challenge、菜单选项、视图响应、命令结果 |
| [飞书](platforms/feishu.md) | type、schema/header、event.type | JSON / encrypt 加密 JSON | Token / Encrypt Key + SHA256；旧卡片 SHA1 | challenge、卡片、链接预览 |
| [Telegram](platforms/telegram.md) | Update 顶层可选字段 | JSON Update | 固定 Secret Token | callback/inline/payment 等业务应答 |
| [Shopify](platforms/shopify.md) | X-Shopify-Topic、API Version | 资源 JSON / 合规专用 JSON | Client Secret + HMAC-SHA256 | 合规处理义务；非法合规签名 `401` |
| [Gitea](platforms/gitea.md) | X-Gitea-Event、X-Gitea-Event-Type | JSON / payload 表单；另列 GET | Secret + HMAC-SHA256；可叠加 Authorization | Test 为合成 push |
| [App Store Connect](platforms/app-store-connect.md) | data.type | data 包装 JSON | Secret + HMAC-SHA256 | 通知确认；Ping 文档边界单列 |

## 编码与签名范围

| 请求编码 | 代表平台 | 签名输入 | 认证后解析 |
|---|---|---|---|
| 原始 JSON | GitHub、GitLab、Stripe、Slack、Shopify、Apple、Gitea | 平台公式中的 B | JSON → 对应信封/资源 |
| payload 表单 | GitHub、Slack | **整个编码表单 B** | 表单解码 → payload 字符串 → JSON |
| payload 表单 | Gitea v1.25.5 | **URL 解码后的 payload JSON 原始文本字节** | 按指定文本验签；不得重序列化 |
| 直接字段表单 | Slack Slash Command | **整个编码表单 B** | 表单键值，不再寻找 payload |
| encrypt JSON | 飞书普通加密事件/新版回调 | 签名覆盖**加密外层 B** | 解析 encrypt → Base64 → AES-CBC → 内层 JSON |
| 无 Body 的 GET | Gitea v1.25.5 | 查询参数 payload 解码后的原始 JSON 文本 | 不是对空 Body 验签 |

## 响应时限索引

| 平台/请求 | 成功状态 | 时限 | Body 要求 | 依据 |
|---|---|---|---|---|
| GitHub 通知/Ping | `2xx` | 10 秒 | 无固定业务 Body | GitHub 页 S3 |
| GitLab.com | `2xx`；官方建议 `200` / `201` | 10 秒 | 无固定业务 Body | GitLab 页 S1、S3 |
| GitLab Self-Managed | 同上 | 实例可配置 | 同上 | GitLab 页 S4 |
| Stripe 普通通知 | `2xx` | 官方要求快速响应，未在所列通用文档规定统一秒数 | 无固定业务 Body | Stripe 页 S1 |
| Stripe Issuing 授权 | `200` | 2 秒 | approved 决策及 Stripe-Version 响应头 | Stripe 页 S4 |
| Slack Events | `2xx` | 3 秒 | URL 验证另需 challenge | Slack 页 S1、S3 |
| Slack 交互/命令 | `200` | 3 秒 | 按回调类型返回 | Slack 页 S4–S8 |
| 飞书地址验证 | `200` | 1 秒 | 明文 challenge JSON | 飞书页 S1 |
| 飞书普通事件 | `200` | 3 秒 | 无统一业务 Body | 飞书页 S2 |
| 飞书卡片 | `200` | 3 秒 | 专用 JSON | 飞书页 S4、S5 |
| 飞书链接预览 | 所列预览结构文档未单列成功状态集合 | 3 秒 | inline / card 专用 JSON | 飞书页 S3、S6 |
| Telegram Update | `2xx` | setWebhook 文档未规定统一秒数 | 可空；可顺带调用 Bot 方法 | Telegram 页 S1、S3 |
| Telegram 结账决策 | HTTP ACK 与业务决策分离 | 决策 10 秒 | answerPreCheckoutQuery | Telegram 页 S6 |
| Shopify HTTPS | `2xx` | 建连 1 秒，整请求 5 秒 | 无统一业务 Body | Shopify 页 S2 |
| Gitea v1.25.5 | `2xx` | DELIVER_TIMEOUT，默认 5 秒，可配置 | 无固定业务 Body | Gitea 页 S2、S5 |
| App Store Connect | 官方所列文档未完整规定成功状态集合 | 官方所列文档未规定统一秒数 | 未规定统一 ACK Body | Apple 页 S1、S3 |
