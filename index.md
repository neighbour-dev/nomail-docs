---
title: NoMail - 自托管通知收件箱与平台接入指南
description: NoMail 将不同平台的事件与通知汇集到 App 收件箱，支持自托管服务保存数据。了解产品用途、服务部署、Webhook 平台接入与开发协议。
layout: home

hero:
  name: NoMail
  text: 自托管通知收件箱
  tagline: 在 NoMail App 中集中查看不同平台的通知，将收件箱数据保存在自己的服务中。
  actions:
    - theme: brand
      text: 开始使用
      link: /guide/
    - theme: alt
      text: 部署自己的服务
      link: /guide/install

features:
  - title: 统一通知收件箱
    details: 在 NoMail App 中集中查看和管理来自不同平台的消息。
    link: /guide/introduction
  - title: 数据由你掌握
    details: 将服务部署到自己的服务器或 Cloudflare Workers，保存通知和事件上下文。
    link: /guide/install
  - title: 连接通知来源
    details: 了解接入平台需要准备什么，以及如何将平台事件送达 NoMail。
    link: /guide/sources
---

## 将平台事件汇集到一个收件箱

NoMail 由 App 和可自托管的服务端组成。服务端接收来源平台的 Webhook，验证并保存事件；你在 App 中集中查看和管理收到的消息。

适合需要汇集开发平台事件、构建结果或服务通知，同时希望掌握收件箱数据的使用场景。

## 从部署服务到接收通知

1. [认识 NoMail](guide/introduction.md)，了解 App、服务端与来源平台之间的关系。
2. [部署自己的服务](guide/install.md)，选择 Docker、二进制、源码或 Cloudflare Workers。
3. [连接通知来源](guide/sources.md)，准备接收地址与平台凭据，配置订阅并验证投递。

## 平台接入与协议参考

- 接入平台前，先阅读[使用指南](guide/index.md)，按实际任务准备服务与凭据。
- 排查平台事件投递问题时，查阅[平台协议参考](reference/index.md)，了解鉴权与投递规则。
- 核对签名、请求体或回调响应时，使用[平台 Webhook 协议索引](reference/webhook-platform-reference-2026-10-30.md)定位具体平台。
