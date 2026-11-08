# Gitea

[平台索引](../webhook-platform-reference-2026-10-30.md) · [约束标记与算法符号](../webhook-contract-conventions.md)

## 1. 范围与版本

| 项目 | 定义 |
|---|---|
| 核对日期 | 2026-11-08 |
| 精确实现基线 | **Gitea v1.25.5**；本页源码约束只承诺该版本，不混写最新文档行为 |
| 适用类型 | Gitea 通用 Webhook；不是 Slack/Discord/Telegram 等转换型集成 |
| 传输 | POST JSON、POST payload 表单；GET payload 查询参数单列 |
| 作用域 | repository / organization / user / system；default Webhook 是复制给新仓库的配置 |

## 2. 配置参数

| 参数 | 值/约束 | 影响 | 来源 |
|---|---|---|---|
| Target URL | 完整接收地址 | 投递目标 | S1 |
| HTTP Method | POST 或 GET | 选择 B1/B2/B3 | S1、S2 |
| POST Content Type | JSON 或 URL 编码表单 | 选择 B1/B2 | S1、S2 |
| Secret | O，文本原文 | A1；不再把 secret 放在 Payload 内 | S1、S2 |
| Authorization Header | O，自定义完整头值 | A2；独立于 Secret | S1、S2 |
| Trigger On / Active | 事件选择/启用状态 | 投递范围 | S1 |
| Branch Filter | glob；仅对带 git ref 的事件生效 | 不限制所有 Issue 等无 ref 事件 | S1 |
| DELIVER_TIMEOUT | [webhook]，秒，默认 5，可配置 | 请求总超时 | S5 |

## 3. 请求类型注册表

| ID | HTTP/编码 | 认证 | Body/数据位置 | 响应 |
|---|---|---|---|---|
| GT-JSON | POST application/json | A1/A2，按配置 | B1 | R1 |
| GT-FORM | POST application/x-www-form-urlencoded | A1/A2，按配置 | B2 | R1 |
| GT-GET | GET | A1/A2，按配置 | B3，HTTP Body 为空 | R1 |
| GT-TEST | 按已配方式投递，事件为 push | 同一配置 | P1 的合成 Push | R1 |
| GT-REPLAY | 重放已有任务 | 按本次配置签名/认证 | 原事件数据，生成新任务 UUID | R1 |

## 4. 认证契约

### A1：HMAC

| 编码 | 精确签名消息 M | 验证头 | 期望值 | 来源 |
|---|---|---|---|---|
| B1 JSON | B | X-Gitea-Signature | HEX(HMAC256(UTF8(secret), M)) | S2 |
| B2 表单 | URL 解码得到的 payload JSON 原始文本的字节 | 同上 | 同上；**不是整个编码表单** | S2 |
| B3 GET | 查询参数 payload 解码后的 JSON 原始文本的字节 | 同上 | 同上；**不是空 HTTP Body** | S2 |

| 签名属性 | 精确规则 | 来源 |
|---|---|---|
| X-Gitea-Signature | 64 位小写十六进制，**没有前缀** | S2 |
| X-Gogs-Signature | 相同 SHA256 摘要的兼容头 | S2 |
| X-Hub-Signature-256 | sha256= + 同一摘要 | S2 |
| X-Hub-Signature | sha1= + 相同 M 的 HMAC-SHA1 摘要 | S2 |
| 无 Secret | 头仍可出现，但摘要为空；兼容头只剩 sha1=/sha256= 前缀 | S2 |
| 时间戳 | 签名不包含时间戳 | S2 |
| 禁止重序列化 | 表单/GET 解码后保留原 JSON 文本；不能转对象再序列化计算摘要 | S2 的消息来源 |

### A2：自定义 Authorization

| 项目 | 规则（S2） |
|---|---|
| 传输值 | 使用配置的完整 Authorization Header 值，不自动解释为某种 Token 类型 |
| 与 A1 关系 | 同一请求可同时有 Authorization 和签名 |
| 覆盖范围 | 固定头不证明 Body 完整性；是否与 A1 共同要求由接收端约定 |

### 请求头

| 名称 | 精确语义 | 来源 |
|---|---|---|
| X-Gitea-Delivery | HookTask.UUID；Replay 会产生新 UUID | S2、S7 |
| X-Gitea-Event | Event-Type 经 Event() 归一化后的事件名 | S2、S3 |
| X-Gitea-Event-Type | 精确 HookEventType 字符串 | S2、S3 |
| X-Gitea-Hook-Installation-Target-Type | repository / organization / user / system 等作用域 | S2 |
| X-GitHub-* / X-Gogs-* | 兼容元信息；不能据此认定源平台是 GitHub/Gogs | S2 |

## 5. 请求体契约

### B1/B2/B3 编码

| ID | HTTP 数据 | 解码步骤 | 来源 |
|---|---|---|---|
| B1 | 原始 JSON 事件 | 按 B 验签 → JSON 解析 | S2 |
| B2 | payload=<URL 编码 JSON> | 表单解码保留 payload 文本 → 以该文本验签 → JSON 解析 | S2 |
| B3 | ?payload=<URL 编码 JSON> | 查询参数解码保留 payload 文本 → 以该文本验签 → JSON 解析 | S2 |

### 事件头精确映射

下表依据 **v1.25.5 的 S3**，不可将精确 Event-Type 直接复制成 Event。

| X-Gitea-Event-Type | X-Gitea-Event | Payload 类型（S4） |
|---|---|---|
| create / delete / fork / push | 与 Event-Type 同名 | CreatePayload / DeletePayload / ForkPayload / PushPayload |
| issues | issues | IssuePayload |
| issue_assign | issues | IssuePayload |
| issue_label | issues | IssuePayload |
| issue_milestone | issues | IssuePayload |
| issue_comment | issue_comment | IssueCommentPayload |
| pull_request | pull_request | PullRequestPayload |
| pull_request_assign | pull_request | PullRequestPayload |
| pull_request_label | pull_request | PullRequestPayload |
| pull_request_milestone | pull_request | PullRequestPayload |
| pull_request_sync | pull_request | PullRequestPayload |
| pull_request_review_request | pull_request | PullRequestPayload |
| pull_request_comment | **issue_comment** | IssueCommentPayload，时间线评论 |
| pull_request_review_approved | **pull_request_approved** | PullRequestPayload + review |
| pull_request_review_rejected | **pull_request_rejected** | PullRequestPayload + review |
| pull_request_review_comment | **pull_request_comment** | PullRequestPayload + review，区别于时间线评论 |
| wiki / repository / release / package / status | 与 Event-Type 同名 | 对应 Payload |
| workflow_run / workflow_job | 与 Event-Type 同名 | WorkflowRunPayload / WorkflowJobPayload |
| pull_request_review | 订阅集合名 | S3 明确为 review_xxx 分组，不据此建立独立通用审核 Payload |
| schedule | S3 标为 Actions 内部事件 | 不作为本表通用外部 Webhook 类型 |

### Payload 字段表

S4 为官方类型定义：不带 omitempty 的字段会序列化；指针可为 null，不能把存在与非 null 混淆。下表列顶层字段；资源内部结构依同版本 S4 引用的类型。

| Payload | 顶层字段/类型 | 条件 |
|---|---|---|
| Create | sha/ref/ref_type:string；repository/sender:object或null | 无统一 action |
| Delete | ref/ref_type/pusher_type:string；repository/sender:object或null | pusher_type 定义为 user |
| Fork | forkee/repository/sender:object或null | forkee 为新 Fork |
| Push（P1） | 见下表 | 无统一 action |
| Issue | action:string、number:integer、issue/repository/sender:object或null、commit_id:string | changes 可省略 |
| IssueComment | action:string、issue/comment/repository/sender:object或null、is_pull:boolean | pull_request、changes 可省略 |
| PullRequest | action:string、number:integer、pull_request/requested_reviewer/repository/sender/review:object或null、commit_id:string | changes 可省略；review 按动作填充 |
| Wiki | action/page/comment:string、repository/sender:object或null | action=created/edited/deleted |
| Repository | action:string、repository/organization/sender:object或null | action=created/deleted |
| Release | action:string、release/repository/sender:object或null | action=published/updated/deleted |
| Package | action:string、package/repository/organization/sender:object或null | action=created/deleted；repository 可 null |
| Status | context/description/sha/state/target_url:string、id:integer、created_at:时间、commit/repository/sender:object或null、updated_at:时间或null | 没有 action；状态由 state 表示 |
| WorkflowRun | action:string、workflow/workflow_run/repository/sender:object或null | pull_request、organization 可省略 |
| WorkflowJob | action:string、workflow_job/repository/sender:object或null | pull_request、organization 可省略 |

### P1：Push

| 字段 | 类型（S4） | 语义 |
|---|---|---|
| ref | string | 完整引用 |
| before / after | string | 前后提交 ID |
| compare_url | string | 比较链接，区别于 GitHub compare |
| commits | object[]或null | PayloadCommit 集合；Go nil slice 可序列化为 null |
| total_commits | integer | 提交数 |
| head_commit | object或null | 头提交 |
| repository / pusher / sender | object或null | 仓库、推送者、操作者 |

| PayloadCommit 字段 | 类型（S4） |
|---|---|
| id / message / url | string |
| author / committer | PayloadUser对象或null；name/email/username 为 string |
| verification | 对象或null |
| timestamp | JSON 时间字符串 |
| added / removed / modified | string[]或null |

## 6. 响应契约 R1

| 项目 | v1.25.5 精确规则 | 来源 |
|---|---|---|
| 成功状态 | 最终响应码满足 status/100==2 | S2 |
| Body | 不要求固定业务 JSON；没有 challenge 回显 | S2 |
| 超时 | http.Client.Timeout=DELIVER_TIMEOUT 秒；默认 5 | S2、S5 |
| 测试 | 合成 Push，与正式请求一样确认；不是 Ping/challenge | S6 |

## 7. 投递语义

| 项目 | v1.25.5 精确规则 | 来源 |
|---|---|---|
| Replay | 复制原 PayloadContent/EventType/PayloadVersion 创建新任务 | S7 |
| Replay ID | CreateHookTask 生成**新的 UUID**，X-Gitea-Delivery 因而变化 | S7、S2 |
| 去重边界 | 仅用 Delivery 去重不能消除人工 Replay 的业务副作用 | S7 的行为；接收端策略结论 |
| 自动重试 | S2/S8 发送器不提供 Stripe 式固定退避重试契约；不能写成固定 N 次补投 | S2、S8 |
| Test Body | before=after，1 条合成提交、total_commits=1；仓库无可用 Commit 时创建假提交 | S6 |
| 排序 | 不提供全局事务序列保证 | S2、S8 未定义 |

## 8. 官方来源

除 S1 外均固定 **v1.25.5**；类型代码仅作为协议证据，不复制引入第三方代码。

| 编号 | 来源 | 约束范围 |
|---|---|---|
| S1 | [Webhooks 文档](https://docs.gitea.com/usage/repository/webhooks/) | 配置概念；当前文档不替代下列固定版本 |
| S2 | [services/webhook/deliver.go](https://github.com/go-gitea/gitea/blob/v1.25.5/services/webhook/deliver.go) | 编码、签名、头、成功状态 |
| S3 | [modules/webhook/type.go](https://github.com/go-gitea/gitea/blob/v1.25.5/modules/webhook/type.go) | 精确 Event-Type → Event 映射 |
| S4 | [modules/structs/hook.go](https://github.com/go-gitea/gitea/blob/v1.25.5/modules/structs/hook.go) | 类型、序列化、null/省略 |
| S5 | [modules/setting/webhook.go](https://github.com/go-gitea/gitea/blob/v1.25.5/modules/setting/webhook.go) | 5 秒默认配置 |
| S6 | [routers/web/repo/setting/webhook.go](https://github.com/go-gitea/gitea/blob/v1.25.5/routers/web/repo/setting/webhook.go) | TestWebhook |
| S7 | [models/webhook/hooktask.go](https://github.com/go-gitea/gitea/blob/v1.25.5/models/webhook/hooktask.go) | Replay 新建任务及 UUID |
| S8 | [services/webhook/webhook.go](https://github.com/go-gitea/gitea/blob/v1.25.5/services/webhook/webhook.go) | 发送队列与任务行为 |
