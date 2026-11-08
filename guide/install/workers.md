---
title: NoMail Cloudflare Workers 部署指南
description: 使用 Cloudflare Workers、D1 和 Durable Objects 部署 NoMail 服务端，安装构建工具、配置远程密钥与初始账号，并了解本地试运行、数据备份和迁移升级步骤。
---

# Cloudflare Workers 部署 NoMail

需要 Rust 1.99+、Node.js 22+ 和 Cloudflare 账号。Workers 使用 D1 和 Durable Objects；bcrypt 和常驻 SSE 有 CPU、连接及费用开销，部署前确认实际套餐限制，不承诺免费套餐适用。

## 1. 获取源码与安装工具

```bash
git clone https://github.com/neighbour-dev/nomail-api.git
cd nomail-api
rustup target add wasm32-unknown-unknown
cargo install worker-build --locked --version 0.8.7
cd crates/nomail-workers
npm ci
```

确保 `worker-build` 在 `PATH` 中。以下命令均在 `crates/nomail-workers` 目录执行。

## 2. 创建资源

```bash
npx wrangler login
npx wrangler d1 create nomail
```

将创建结果中的 `database_id` 写入 `wrangler.toml`。文件中的全零 ID 只用于本地开发；若调整数据库名称，也同步修改 `database_name`。按需修改 Worker 的 `name`，保留代码使用的绑定名 `DB` 和 `REALTIME`。

## 3. 配置远程密钥与初始账号

按[通用配置说明](../install.md#准备密钥与初始账号)准备独立的密钥、初始用户名和密码。依次运行，在提示中输入实际值：

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put SECRET_ENCRYPTION_KEY
npx wrangler secret put INITIAL_USERNAME
npx wrangler secret put INITIAL_PASSWORD
```

`JWT_ISSUER` 位于 `wrangler.toml` 的 `[vars]` 中。本地 `.env` 或 `.dev.vars` 不会代替远程 Secret 配置。

## 4. 初始化并部署

确认目标数据库后执行：

```bash
npx wrangler d1 migrations apply DB --remote
npm run deploy
```

Wrangler 会调用 `worker-build --release` 并部署 `Realtime` Durable Object。使用部署输出的地址检查 `/api/health`，响应的 `data.status` 和 `data.db` 应均为 `ok`。

Workers 在首次登录时初始化账号。登录并修改密码后，删除远程初始密码：

```bash
npx wrangler secret delete INITIAL_PASSWORD
```

接下来按[部署后的通用配置](../install.md#部署后的通用配置)连接 NoMail App 和通知来源。

## 可选：本地试运行

本地试运行不连接远程数据库。首次使用时创建配置；已有 `.dev.vars` 时不要覆盖：

```bash
cp .dev.vars.example .dev.vars
```

填写 `.dev.vars` 的密钥和账号，再运行：

```bash
npx wrangler d1 migrations apply DB --local
npm run dev
```

使用 Wrangler 输出的本地地址。`.dev.vars` 和本地数据库不得提交到仓库；本地修改不会更新远程部署。

## 备份与升级

1. 核对[通用备份与升级要求](../install.md#备份与升级的通用要求)，安全备份密钥，升级时不要重新生成。
2. 使用 Cloudflare 提供的 D1 导出或恢复能力保存备份，并确认恢复流程。
3. 获取目标版本源码，保留资源绑定与现有配置；依赖变化时重新执行 `npm ci`。
4. 在 `crates/nomail-workers` 目录确认目标数据库，执行 `npx wrangler d1 migrations apply DB --remote`，再执行 `npm run deploy`。

迁移影响及客户端兼容性要求以目标版本的[更新日志](https://github.com/neighbour-dev/nomail-api/blob/main/CHANGELOG.md)为准。Server 与 Workers 不支持直接交换 SQLite/D1 数据库文件。

## 账号恢复限制

Workers 不提供 Server 的本地账号重置工具，也没有公开的找回密码接口，请妥善保存账号和备份。
