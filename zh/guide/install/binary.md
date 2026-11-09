---
title: NoMail 发布二进制部署指南
description: 在 Linux amd64 或 arm64 上使用 NoMail 发布二进制部署服务，校验下载文件、配置账号和加密密钥，并完成 SQLite 数据备份、升级与密码恢复。
---

# 使用发布二进制部署 NoMail

适合不使用 Docker、也不希望安装 Rust 的 Linux 环境。需要 amd64 或 arm64 架构及 glibc 2.39+（如 Ubuntu 24.04），不适用于默认使用 musl 的 Alpine。当前功能无需额外安装 CA 证书或时区数据。

## 1. 下载与解压

从 [GitHub Releases](https://github.com/neighbour-dev/nomail-api/releases) 下载对应架构的 `nomail-api-<版本>-linux-amd64.tar.gz` 或 `nomail-api-<版本>-linux-arm64.tar.gz`，以及 `SHA256SUMS`，放在同一目录。无需克隆源码仓库。

以下以 amd64 为例，将 `vX.Y.Z` 替换为下载的版本：

```bash
sha256sum --ignore-missing -c SHA256SUMS
mkdir -p nomail-server
tar -xzf nomail-api-vX.Y.Z-linux-amd64.tar.gz -C nomail-server
cd nomail-server
```

压缩包包含服务程序 `nomail-api`、`gen-secret-key`、`reset-account`、示例配置和许可证。

## 2. 准备配置

首次安装时创建配置文件；已有 `.env` 时不要覆盖：

```bash
cp .env.example .env
```

按[通用配置说明](../install.md#准备密钥与初始账号)填写 `.env` 中的密钥、初始用户名和密码。也可运行以下命令生成凭据加密密钥：

```bash
./gen-secret-key
```

生成器输出完整的 `SECRET_ENCRYPTION_KEY=...` 配置行。`JWT_SECRET` 仍需独立生成。

## 3. 启动与检查

在解压目录中运行：

```bash
./nomail-api
```

默认监听 `0.0.0.0:3000`，数据库位于 `./data/nomail.db`。目录、数据库和表会自动创建，使用 SQLite WAL 和外键约束，无需另外部署数据库服务。

在另一个终端检查：

```bash
curl http://127.0.0.1:3000/api/health
```

正常时响应的 `data.status` 和 `data.db` 均为 `ok`；修改端口后应相应调整访问地址。

`.env` 从进程当前目录加载。生产环境应通过服务管理器配置工作目录、环境变量及自动重启。

首次启动会初始化账号。登录并修改密码后，移除配置中的 `INITIAL_PASSWORD` 并重启服务。接下来按[部署后的通用配置](../install.md#部署后的通用配置)准备公网访问并连接通知来源。

## 备份与升级

1. 核对[通用备份与升级要求](../install.md#备份与升级的通用要求)，安全保存 `.env` 和原加密密钥。
2. 停止服务后备份整个数据目录，或使用 SQLite 在线备份工具。WAL 模式下不能在运行时只复制主数据库文件。
3. 下载并校验目标版本，替换程序文件，保留原配置与数据目录，不要用示例文件覆盖 `.env`。
4. 通过服务管理器重启，检查健康状态和日志。启动时会自动应用待执行的数据库迁移。

Server 不需要 PostgreSQL，也不提供旧 PostgreSQL 数据迁移。

## 忘记密码

在与运行服务相同的工作目录中，使用相同数据库路径及配置执行：

```bash
./reset-account --username admin --password '<新密码>'
```

`--username` 可省略以保留原用户名；重置会撤销全部会话。密码经命令行参数传递，应在可信终端操作，注意命令历史和进程参数的可见性。
