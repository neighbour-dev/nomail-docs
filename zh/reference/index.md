---
title: NoMail 平台协议参考 - Webhook 鉴权与投递规则
description: 查阅各通知来源平台的 Webhook 鉴权、请求体、响应和重试规则，了解平台事件投递要求，在连接通知来源或排查投递问题时核对协议细节。
---

# NoMail 平台协议参考

本模块介绍来源平台向 NoMail 发送 Webhook 请求时使用的协议，供连接通知来源及排查投递问题时参考。

## 上游平台协议

| 内容 | 入口 |
|---|---|
| 平台类型、编码与响应要求 | [平台 Webhook 协议索引](webhook-platform-reference-2026-10-30.md) |
| 字段必填性、版本依据与算法符号 | [协议阅读约定](webhook-contract-conventions.md) |

每个平台独立说明请求识别、来源认证、Body 结构、响应契约及投递语义。

不涉及协议实现、只需连接通知来源时，请从[使用指南](../guide/index.md)开始。
