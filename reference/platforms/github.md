# GitHub

[平台索引](../webhook-platform-reference-2026-10-30.md) · [约束标记与算法符号](../webhook-contract-conventions.md)

## 1. 范围与版本

| 项目 | 定义 |
|---|---|
| 核对日期 | 2026-11-08 |
| 适用 | GitHub.com 仓库、组织、GitHub App 等 HTTP Webhook；事件可用范围按 S1 的 Availability |
| 传输 | HTTP POST；JSON 或 URL 编码表单 |
| 事件版本 | 依 GitHub 当前事件定义；不能将 REST API 的版本头自动视为 Webhook Payload 版本 |
| 覆盖层次 | 完整 HTTP/认证/确认契约；事件资源按指定 action 的 S1 Schema 解析 |

## 2. 配置参数

| 参数 | 平台要求 | 用途 | 来源 |
|---|---|---|---|
| Payload URL | 接收端完整 URL | POST 目的地址 | S2 |
| Content type | application/json 或 application/x-www-form-urlencoded | 选择 B1/B2 | S2 |
| Secret | O；高熵随机文本 | 签名密钥原文，不是 PAT/OAuth/App 私钥 | S2、S4 |
| Events | 选择订阅事件 | 不改变认证算法 | S2 |
| Active | 控制是否启用 | 不改变 Payload Schema | S2 |
| SSL verification | 官方建议启用；HTTPS | 校验接收端证书 | S3 |

## 3. 请求类型注册表

| ID | 识别条件 | 认证 | Body | 响应 | 来源 |
|---|---|---|---|---|---|
| GH-PING | X-GitHub-Event=ping | A1；历史 A2；无 Secret 时 A0 | B1/B2 + P1 | R1 | S1、S2 |
| GH-EVENT | X-GitHub-Event 为订阅事件 | 同上 | B1/B2 + 对应事件/action | R1 | S1 |
| GH-REDELIVERY | 历史投递被重新发送；事件名不变 | 同上，仍校验本次请求 | 原事件数据 | R1 | S3、S5 |

## 4. 认证契约

| ID | 启用条件 | 校验头 | 精确计算 | 说明 |
|---|---|---|---|---|
| A0 | 未配置 Secret | 不发送 Secret 签名 | 无应用级签名 | 平台允许；是否接受由接收端认证策略决定 |
| A1 | 配置 Secret | X-Hub-Signature-256 | `"sha256=" + HEX(HMAC256(UTF8(secret), B))` | 前缀大小写/内容固定；常量时间比较 |
| A2 | 历史兼容签名 | X-Hub-Signature | `"sha1=" + HEX(HMAC-SHA1(UTF8(secret), B))` | 官方建议新实现使用 A1 |

| 属性 | 精确约束 | 来源 |
|---|---|---|
| 签名覆盖 | HTTP Body 的全部原始字节，包括表单编码文本 | S1、S4 |
| 字符编码 | 文本使用 UTF-8；Unicode 不得被重新转义/格式化后再验签 | S4 |
| 时间戳 | A1/A2 没有签名时间戳字段 | S4 的算法定义 |
| 路由头 | Event、Delivery、Hook-ID 不在 A1/A2 的签名输入中 | S4 的算法定义 |
| 签名格式 | A1：sha256= 后接 64 位十六进制；A2：sha1= 后接 40 位 | S4 |

### 请求头

| 名称 | 类型/出现条件 | 语义 | 来源 |
|---|---|---|---|
| X-GitHub-Event | R，string | 事件类型，不是 action | S1 |
| X-GitHub-Delivery | R，GUID 文本 | 投递事件标识；人工重投保持相同 | S1、S3 |
| X-GitHub-Hook-ID | R，ID 文本 | Webhook 配置 ID | S1 |
| X-Hub-Signature-256 / X-Hub-Signature | C，配置 Secret 时 | A1/A2 | S1 |
| X-GitHub-Hook-Installation-Target-Type / ID | S1 列出的投递元信息 | 创建 Webhook 的目标类别与 ID | S1 |
| User-Agent | 前缀 GitHub-Hookshot/ | 非认证凭据 | S1 |

## 5. 请求体契约

### B1/B2：外层编码

| ID | Content-Type | HTTP Body | 解码步骤 |
|---|---|---|---|
| B1 | application/json | 事件 JSON 本身 | 按 B 验签 → JSON 解析 |
| B2 | application/x-www-form-urlencoded | payload= 后接 URL 编码的 JSON | 按整个 B 验签 → 表单解码 → JSON 解析 payload |

### P1：Ping

S1 描述以下字段，未将它们逐项标为 Required；此表使用 D，不自行生成必填约束。

| 路径 | 类型 | 出现规则 | 语义 |
|---|---|---|---|
| zen | string | D | GitHub 返回的随机 Zen 文本，不是 challenge |
| hook_id | integer | D | 被 Ping 的 Webhook ID |
| hook | object | D | 被 Ping 的 Webhook 配置对象 |

### 事件共用上下文

| 路径 | 类型 | 出现规则（S1） |
|---|---|---|
| action | string | C，该事件定义 action 时；不是所有事件共有 |
| repository | object | C，活动发生在仓库中 |
| organization | object | C，组织 Webhook 或组织仓库相关活动 |
| installation | object | C，GitHub App 投递 |
| enterprise | object | C，企业账号相关上下文 |
| sender | object | 按具体事件；可能为 ghost 用户，不能推断总是实际操作者 |

### 业务事件分发表

表中的资源为字段路径投影；完整必填性及 action 专有字段以同一行 S1 锚点为契约。

| 事件头 | action / 次级识别 | Body 对象/字段 | 完整定义 |
|---|---|---|---|
| push | 无统一 action；created/deleted/forced 为 boolean | 见 P2 | [S1 push](https://docs.github.com/en/webhooks/webhook-events-and-payloads#push) |
| create / delete | ref_type=branch/tag | ref、ref_type、pusher_type；create 另有 description、master_branch | [S1 create](https://docs.github.com/en/webhooks/webhook-events-and-payloads#create)、[delete](https://docs.github.com/en/webhooks/webhook-events-and-payloads#delete) |
| issues | 按 action；edited 等有 changes | issue、action 专有的 label/assignee/milestone 等 | [S1 issues](https://docs.github.com/en/webhooks/webhook-events-and-payloads#issues) |
| issue_comment | created/edited/deleted | issue、comment；issue.pull_request 表示 PR 对话 | [S1 issue_comment](https://docs.github.com/en/webhooks/webhook-events-and-payloads#issue_comment) |
| pull_request | 按 action；合并判定为 closed 且 pull_request.merged=true | number、pull_request；其他字段按 action | [S1 pull_request](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request) |
| pull_request_review | submitted/edited/dismissed；结果在 review.state | review、pull_request | [S1 review](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request_review) |
| pull_request_review_comment | created/edited/deleted | comment、pull_request | [S1 review_comment](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request_review_comment) |
| workflow_run | requested/in_progress/completed | workflow: object或null（R）；workflow_run: object（R） | [S1 workflow_run](https://docs.github.com/en/webhooks/webhook-events-and-payloads#workflow_run) |
| workflow_job | queued/waiting/in_progress/completed | workflow_job: object（R）；deployment 按条件 | [S1 workflow_job](https://docs.github.com/en/webhooks/webhook-events-and-payloads#workflow_job) |
| release | created/deleted/edited/prereleased/published/released/unpublished | release: object（R）；edited 有 changes | [S1 release](https://docs.github.com/en/webhooks/webhook-events-and-payloads#release) |
| deployment_status | deployment_status.state | deployment、deployment_status 均 object（R） | [S1 deployment_status](https://docs.github.com/en/webhooks/webhook-events-and-payloads#deployment_status) |
| check_run / check_suite | 按 action | check_run / check_suite | [S1 check_run](https://docs.github.com/en/webhooks/webhook-events-and-payloads#check_run)、[check_suite](https://docs.github.com/en/webhooks/webhook-events-and-payloads#check_suite) |
| installation / installation_repositories | 按 action | installation、repositories 或 repositories_added/removed | [S1 installation](https://docs.github.com/en/webhooks/webhook-events-and-payloads#installation)、[installation_repositories](https://docs.github.com/en/webhooks/webhook-events-and-payloads#installation_repositories) |
| 其他事件 | 按各自定义 | 不套用上述某个资源模型 | [S1 完整事件目录](https://docs.github.com/en/webhooks/webhook-events-and-payloads) |

### P2：Push 的事件专有字段

以下字段在 S1 push 中均为 R；共用上下文按上一表另行合并。

| 路径 | 类型 | 约束 |
|---|---|---|
| ref | string | 完整引用，如 refs/heads/main 或 refs/tags/v1.0 |
| before / after | string | 变更前/后 SHA |
| base_ref | string或null | 存在但允许 null |
| created / deleted / forced | boolean | 分别表示创建引用、删除引用、强推 |
| compare | string | 比较 URL；不是 Gitea 的 compare_url |
| commits | object[] | 最多 2048 条；不是所有推送均可由该数组完整还原 |
| head_commit | object或null | 必须允许 null |
| pusher | object | Git 作者/提交者相关信息 |

## 6. 响应契约 R1

| 项目 | 精确规则 | 来源 |
|---|---|---|
| 成功状态 | `2xx` | S3 |
| 完成时限 | 收到请求后 10 秒内 | S3 |
| Body | 未规定固定业务 Body；无 challenge 回显 | S1、S3 |
| Ping | 与普通投递同样确认；zen 不作为响应字段 | S1 |
| 业务后续动作 | ACK 不等于完成部署审批等反向 API 操作 | 对应事件定义 |

## 7. 投递语义

| 项目 | 规则 | 来源 |
|---|---|---|
| 自动失败重投 | 不自动重投；可人工或自行定时调用 API 重投 | S5 |
| 重投标识 | 重投 X-GitHub-Delivery 与原请求相同 | S3 |
| Payload 上限 | 25 MB；超过时不发送该 Payload，不是拆包投递 | S1 |
| 顺序 | 不建立全局提交序号或快照保证 | S1 未提供该保证 |

## 8. 官方来源

| 编号 | 来源 | 约束范围 |
|---|---|---|
| S1 | [Webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads) | 事件、字段、请求头、Payload 上限 |
| S2 | [Creating webhooks](https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks) | 配置及 JSON/表单编码 |
| S3 | [Best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks) | 10 秒确认、重投 ID |
| S4 | [Validating deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) | 签名输入、编码与比较 |
| S5 | [Handling failed deliveries](https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries) | 不自动重投 |
