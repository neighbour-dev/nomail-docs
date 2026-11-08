---
title: NoMail Docker Compose 部署指南
description: 使用 Docker Compose 和官方 GHCR 镜像部署 NoMail，配置密钥与初始账号，检查服务状态，并了解 SQLite 数据卷、镜像升级、备份与账号恢复方法。
---

# Docker Compose 部署 NoMail

需要 Docker Engine 和 Compose v2，无需安装 Rust 或单独部署数据库。使用官方 GHCR 镜像，数据保存在持久化卷中的 SQLite。

## 1. 获取部署文件

```bash
git clone https://github.com/neighbour-dev/nomail-api.git
cd nomail-api
```

以下命令均从仓库根目录执行。`compose.yml` 默认使用：

```yaml
image: ghcr.io/neighbour-dev/nomail-api:latest
```

## 2. 准备配置

先按[通用配置说明](../install.md#准备密钥与初始账号)准备独立的密钥、初始用户名和密码。

首次安装时创建配置文件；已有 `.env` 时不要覆盖：

```bash
cp .env.example .env
```

编辑 `.env`，填写密钥与初始账号，并保留或调整：

```dotenv
JWT_ISSUER=nomail-api
PORT=3000
RUST_LOG=info
```

## 3. 启动与检查

```bash
docker compose pull
docker compose up -d
docker compose logs --tail=100 nomail-api
curl http://127.0.0.1:3000/api/health
```

健康检查正常时，响应的 `data.status` 和 `data.db` 均为 `ok`。若修改了 `PORT`，相应调整访问地址。健康检查不设置应用级请求限流；有需要时可在反向代理或 CDN 配置入口限流。

Compose 将数据库放在 `nomail-data` 卷的 `/data/nomail.db`，覆盖 `.env` 中的 `DATABASE_PATH`；容器根文件系统只读，数据库及 WAL/SHM 文件写入数据卷。不要使用 `docker compose down -v`，除非明确要删除全部数据。

首次启动会初始化账号。登录并修改密码后，从 `.env` 移除 `INITIAL_PASSWORD`，重新执行 `docker compose up -d`。之后修改 `.env` 也需重新执行该命令以应用环境变量变化。

接下来按[部署后的通用配置](../install.md#部署后的通用配置)准备公网访问并连接通知来源。

## 可选：本地构建镜像

如需部署本地修改，在仓库根目录构建镜像：

```bash
docker build -t nomail-api:local .
```

将 `compose.yml` 的 `image` 改为：

```yaml
image: nomail-api:local
```

同样需要创建并填写 `.env`，然后启动（不要执行 `docker compose pull`）：

```bash
docker compose up -d --pull never
```

## 备份与升级

发布镜像支持 `linux/amd64` 和 `linux/arm64`，Docker 会自动选择当前机器对应的架构。`latest` 跟随稳定版发布更新，不包含预发布版本。生产部署建议改用明确的稳定版本标签（如 `vX.Y.Z`）。

1. 核对[通用备份与升级要求](../install.md#备份与升级的通用要求)，保存配置及原加密密钥。
2. 停止服务后备份整个数据卷，或使用 SQLite 在线备份工具。WAL 模式下不能在运行时只复制主数据库文件。
3. 在 `compose.yml` 中设置目标镜像版本，再执行 `docker compose pull` 和 `docker compose up -d`；本地镜像则重新构建，并使用 `--pull never` 启动。

Server 启动时自动应用待执行的数据库迁移。不要为升级删除数据卷。

## 忘记密码

```bash
docker compose exec nomail-api reset-account --username admin --password '<新密码>'
```

`--username` 可省略以保留原用户名；重置会撤销全部会话。密码经命令行参数传递，应在可信终端操作，注意命令历史和进程参数的可见性。
