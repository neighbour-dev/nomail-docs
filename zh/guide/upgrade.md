---
title: 升级 NoMail 到最新正式版
description: 升级前确认版本兼容性、备份数据、准备不兼容的消息存储迁移，并制定回退方案。
---

# NoMail 版本升级

本页统一说明版本特定的升级前置条件。全新安装请看[安装与部署](install.md)；完成以下前置步骤后，再回到对应部署页执行该运行方式的备份与程序替换命令。

升级目标为[最新正式发布版](https://github.com/neighbour-dev/nomail-api/releases/latest)，不跟随 `main` 或其中的 Unreleased 说明。先阅读目标版本的发布说明，只执行本次升级跨越的迁移条件。下文版本号用于标识历史不兼容变更，不是固定安装目标。

## 确认起始版本

| 起始状态 | 处理方式 |
|---|---|
| 全新实例 | 按部署指南安装，无历史数据需要迁移 |
| v0.2.0 或 v0.3.0 | 先完成下述消息存储迁移前置步骤 |
| v0.1.0 或更旧 Schema | 不支持原地转换到 v0.2.0 的配置 Schema；备份后使用新数据库并重建配置，旧账号与消息不会自动导入 |
| v0.4.0 或更新版本 | 不要为 v0.4.0 的迁移再次清空消息；后续前置条件以目标版本发布说明为准 |

## 跨越 v0.4.0：消息存储迁移

本节仅适用于从 v0.4.0 之前的版本升级到 v0.4.0 或更新版本。

**旧消息不兼容，不提供转换或兼容读取。若需要继续在 NoMail 中访问历史消息，不可采用这条升级路径。**

1. 停止旧实例并阻断入站写入。Workers 应在整个迁移与部署窗口阻断请求。
2. 按对应部署页的方法备份数据库与配置，安全保存原 `JWT_SECRET`、`JWT_ISSUER` 和 `SECRET_ENCRYPTION_KEY`。
3. 仅在确认备份并接受消息丢失后，通过数据库管理工具物理清空 `notify_messages`，包括软删除记录。在 App 中删除消息不够，无需清空账号、设备或接收配置。
4. 回到对应部署页继续操作：Server 启动时自动应用待执行迁移；Workers 必须在切换新代码前应用 `0003_raw_storage.sql`。第 3 个迁移新增 `raw_headers`、删除 `platform_data`。**消息表非空会导致迁移失败，应用不会自动清空消息。**
5. 检查健康状态、登录和新的测试投递，确认正常后再恢复流量。

## 确认客户端兼容性

客户端需支持目标版本的原始事件与平台数据契约，包括可空的 `platformData` 和原生 Payload 路径，详见[最新版 OpenAPI 附件](https://github.com/neighbour-dev/nomail-api/releases/latest/download/swagger.json)。能够登录不代表消息详情兼容。

从 v0.2.0 升级时还需核对 SSE 兼容性变更。完整变更与后续前置条件见[最新正式版发布说明](https://github.com/neighbour-dev/nomail-api/releases/latest)。

## 回退

迁移后的数据库不能直接交给旧程序使用。回退时需一并恢复升级前的数据库、配置和旧程序。Server 与 Workers 的数据库文件不能互换。

## 继续对应部署操作

- [Docker Compose](install/docker.md#备份与升级)
- [发布二进制](install/binary.md#备份与升级)
- [源码构建](install/source.md#备份与升级)
- [Cloudflare Workers](install/workers.md#备份与升级)
