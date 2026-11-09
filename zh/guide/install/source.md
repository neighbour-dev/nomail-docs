---
title: NoMail 源码构建与部署指南
description: 使用 Rust 从源码构建 NoMail Server，生成凭据加密密钥、配置初始账号并启动服务，了解 SQLite 存储、服务管理、备份升级及本地账号重置。
---

# 从源码构建与部署 NoMail

需要 Rust 1.99+ 及平台编译工具，适合需要修改服务端代码或自行构建的部署。使用本地 SQLite，无需另外部署数据库服务。

## 1. 获取源码

```bash
git clone https://github.com/neighbour-dev/nomail-api.git
cd nomail-api
```

以下命令均在仓库根目录执行。

## 2. 准备配置

首次安装时创建配置并生成凭据加密密钥；已有 `.env` 时不要覆盖，也不要重新生成已有部署的加密密钥：

```bash
cp .env.example .env
cargo run --locked -p nomail-server --bin gen-secret-key
```

生成器输出完整的 `SECRET_ENCRYPTION_KEY=...` 配置行。按[通用配置说明](../install.md#准备密钥与初始账号)填写 `.env` 中的其余密钥和初始账号，`JWT_SECRET` 需独立生成。

## 3. 构建与启动

```bash
cargo build --locked --release -p nomail-server --bins
./target/release/nomail-api
```

默认监听 `0.0.0.0:3000`，数据库为 `./data/nomail.db`，目录、数据库和表会自动创建。Server 使用 SQLite WAL 和外键约束，不需要 PostgreSQL，也不提供旧 PostgreSQL 数据迁移。

在另一个终端检查：

```bash
curl http://127.0.0.1:3000/api/health
```

正常时响应的 `data.status` 和 `data.db` 均为 `ok`；修改端口后应相应调整访问地址。

`.env` 从进程当前目录加载；生产环境应通过服务管理器配置工作目录、环境变量及自动重启。

首次启动会初始化账号。登录并修改密码后，移除配置中的 `INITIAL_PASSWORD` 并重启服务。接下来按[部署后的通用配置](../install.md#部署后的通用配置)准备公网访问并连接通知来源。

## 备份与升级

1. 核对[通用备份与升级要求](../install.md#备份与升级的通用要求)，保存配置与原加密密钥。
2. 停止服务后备份整个数据目录，或使用 SQLite 在线备份工具。WAL 模式下不能在运行时只复制主数据库文件。
3. 获取目标版本的源码，保留现有 `.env` 和数据目录，重新执行构建命令并重启服务。
4. 检查健康状态与日志。Server 启动时自动应用待执行的数据库迁移。

## 忘记密码

使用与运行服务相同的工作目录、数据库路径及配置执行：

```bash
./target/release/reset-account --username admin --password '<新密码>'
```

`--username` 可省略以保留原用户名；重置会撤销全部会话。密码经命令行参数传递，应在可信终端操作，注意命令历史和进程参数的可见性。
