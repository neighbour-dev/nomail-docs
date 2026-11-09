---
title: NoMail 服务端安装与部署指南
description: 选择 Docker Compose、发布二进制、源码构建或 Cloudflare Workers 部署 NoMail 服务端，了解各方式的环境要求与存储差异，并准备通用密钥与初始账号。
---

# NoMail 服务端安装与部署

NoMail 由 App 和可自托管的服务端组成：服务端接收并保存来自不同平台的通知，App 用于查看和管理消息。部署服务端后，即可让 NoMail App 连接自己的服务。

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
| `INITIAL_USERNAME` | 数据库账号表为空时创建的初始用户名 |
| `INITIAL_PASSWORD` | 初始密码，至少 8 个字符，包含英文字母和数字，最多 72 字节 |

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

Docker、二进制和源码运行的 Server 在首次启动时初始化账号；Workers 在首次登录时初始化。**先使用初始账号登录并修改密码，再按对应部署页面移除 `INITIAL_PASSWORD`**。已有账号不会因重新设置初始配置而被覆盖。

## 部署后的通用配置

- 保存好服务地址和账号，供 NoMail App 连接自己的服务使用。首次登录后修改初始密码；改密会退出全部登录会话，需要重新登录。
- 按[连接通知来源](sources.md)完成 NoMail 与来源平台两侧的配置，再通过平台测试投递检查消息是否送达。创建 NoMail 接收配置不会自动创建平台侧订阅。
- 公网部署应使用 HTTPS，并在反向代理或 Cloudflare 设置请求限流与防滥用措施。
- 通过反向代理部署时，应正确设置并清洗客户端 IP 转发头；设备 IP 仅用于展示，不应作为访问控制依据。
- 代理 SSE 时关闭响应缓冲，并设置大于 20 秒心跳间隔的读取超时。SSE 仅用于在线更新，无离线投递或重放，重连后应重新查询收件箱。

## 备份与升级的通用要求

- 同时安全保存 `JWT_SECRET`、`JWT_ISSUER` 和 `SECRET_ENCRYPTION_KEY`，升级时保持稳定。
- 升级前核对目标版本的[更新日志](https://github.com/neighbour-dev/nomail-api/blob/main/CHANGELOG.md)并备份；程序不会自动清空已有数据。新增迁移与新安装基线不同，不代表支持所有历史 Schema 的转换。
- Server 与 Workers 的数据库编码不同，不支持直接交换 SQLite/D1 数据库文件。
- 各部署方式的数据库备份、升级命令与账号恢复限制，请查看对应部署页面。
