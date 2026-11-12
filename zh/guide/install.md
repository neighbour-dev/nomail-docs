---
title: NoMail 服务端安装与部署指南
description: 选择 Docker Compose、发布二进制、源码构建或 Cloudflare Workers 部署 NoMail 服务端，了解各方式的环境要求与存储差异，并准备通用密钥与初始账号。
---

# NoMail 服务端安装与部署

本页介绍部署方式与服务端通用配置，持续跟随[最新正式发布版](https://github.com/neighbour-dev/nomail-api/releases/latest)，不跟随含未发布功能的 `main` 分支。产品职责见[认识 NoMail](introduction.md)，已有实例的版本升级见[版本升级](upgrade.md)。

## 选择部署方式

选择一种方式即可，每种方式的安装、启动、升级与账号恢复说明均在对应页面中：

| 方式 | 环境要求 | 数据存储 |
|---|---|---|
| [Docker Compose](install/docker.md) | Docker Engine、Compose v2 | 持久化卷中的 SQLite |
| [发布的二进制](install/binary.md) | Linux amd64 或 arm64，glibc 2.39+（如 Ubuntu 24.04） | 本地 SQLite 文件 |
| [源码构建](install/source.md) | Rust 1.99+、系统编译工具 | 本地 SQLite 文件 |
| [Cloudflare Workers](install/workers.md) | Rust 1.99+、Node.js 22+、Cloudflare 账号 | D1、Durable Objects |

Docker Compose 和二进制部署无需安装 Rust；Workers 的构建工具、资源创建及部署流程见其独立页面。

## 准备密钥与初始账号

以下配置适用于各部署方式，按对应页面写入 `.env`、`.dev.vars` 或 Workers Secret。

**不要直接使用示例文件中的密码或密钥。** 复制示例配置仅用于首次安装。已有配置时不要覆盖；升级前先备份，不要重新生成已有部署的加密密钥。

| 配置 | 用途与要求 |
|---|---|
| `JWT_SECRET` | Token 签名密钥；使用独立、高强度随机值 |
| `JWT_ISSUER` | Token 签发者，默认 `nomail-api` |
| `SECRET_ENCRYPTION_KEY` | 接收配置凭据的加密密钥；Base64 编码的 32 字节随机数据 |
| `INITIAL_USERNAME` | 初始用户名，1～64 个字符，仅在账号表为空时使用 |
| `INITIAL_PASSWORD` | 初始密码，至少 8 个字符，包含 ASCII 英文字母和数字，最多 72 个 UTF-8 字节 |

### 配置加密密钥

`SECRET_ENCRYPTION_KEY` 用于加密和解密服务端保存的平台敏感凭据，例如 Webhook 密钥。它与平台侧的接收密钥不同，必须是 Base64 编码的 32 字节随机数据，供 AES-256-GCM 使用，不能用普通密码或任意字符串代替。

如果安装了 OpenSSL，可分别运行下面两条命令，第一条输出填入 `JWT_SECRET`，第二条填入 `SECRET_ENCRYPTION_KEY`：

```bash
openssl rand -hex 32
openssl rand -base64 32
```

JWT 密钥和凭据加密密钥应独立生成。不要把真实密钥提交到 Git，也不要写进示例配置文件。二进制和源码部署还可使用各自页面介绍的 `gen-secret-key` 工具。

**安全备份并保持已有部署的加密密钥不变。密钥丢失或更换后，之前加密保存的平台凭据将无法解密；恢复数据库时也需要原密钥。**

### 初始账号

首次使用前设置 `INITIAL_USERNAME` 和 `INITIAL_PASSWORD`。Docker、二进制和源码运行的 Server 在启动时初始化账号，Workers 在首次登录时初始化。**先登录并修改初始密码，再按对应部署页移除 `INITIAL_PASSWORD`。** 修改这些配置不会覆盖已有账号。

HTTP 契约见[最新版 OpenAPI 附件](https://github.com/neighbour-dev/nomail-api/releases/latest/download/swagger.json)。

## 部署后的通用配置

- 保存好服务地址和账号，供 NoMail App 连接自己的服务使用。修改密码会退出全部登录会话，需要重新登录。
- 接下来按[连接通知来源](sources.md)完成接入。
- 公网部署应使用 HTTPS，并在反向代理或 Cloudflare 设置请求限流与防滥用措施。
- 通过反向代理部署时，应正确设置并清洗客户端 IP 转发头；设备 IP 仅用于展示，不应作为访问控制依据。
- 代理 SSE 时关闭响应缓冲，并设置大于 20 秒心跳间隔的读取超时。

## 备份与升级的通用要求

- 同时安全保存 `JWT_SECRET`、`JWT_ISSUER` 和 `SECRET_ENCRYPTION_KEY`，升级时保持稳定。
- 替换程序或执行迁移前，先阅读[版本升级](upgrade.md)。版本特定的前置条件与兼容性警告统一在该页维护。
- Server 与 Workers 的数据库编码不同，不支持直接交换 SQLite/D1 数据库文件。
- 各部署方式的数据库备份、升级命令与账号恢复限制，请查看对应部署页面。
