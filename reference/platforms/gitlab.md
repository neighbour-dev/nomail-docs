---
title: GitLab Webhook 签名认证与事件请求体协议 | NoMail
description: 查阅 GitLab Signing Token、旧 Secret Token、自定义 JSON 模板、项目和组事件结构，以及 GitLab.com 超时、测试、重投和自动禁用规则。
---

# GitLab Webhook 协议

[平台索引](../webhook-platform-reference-2026-10-30.md) · [约束标记与算法符号](../webhook-contract-conventions.md)

## 1. 范围与版本

| 项目 | 定义 |
|---|---|
| 核对日期 | 2026-11-08 |
| 适用 | 项目与组 Webhook；不包含实例级 System Hooks |
| 版本边界 | Signing Token、事件种类、组事件依实例版本/套餐；不将当前文档能力倒推到旧实例 |
| HTTP | POST + JSON；自定义模板仍需生成合法 JSON |

## 2. 配置参数

| 参数 | 平台要求/类型 | 影响 | 来源 |
|---|---|---|---|
| URL | 完整接收地址 | 投递目标 | S1 |
| Signing Token | 平台生成；只显示一次；API 不返回 | 启用 A1 | S1 |
| Secret Token | 用户配置的文本；旧方式 | 启用 A2；仅传固定值，不签 Body | S1 |
| Custom headers | O；最多 20 个；不能覆盖平台投递头 | 额外认证头，不改变 A1/A2 | S1 |
| Custom webhook template | O；必须渲染成合法 JSON | B2 代替默认 B1 | S1 |
| Trigger / SSL verification | 订阅事件与证书校验 | 事件范围、TLS | S1 |
| mTLS | Self-Managed 管理员全局配置客户端证书 | TLS 层客户端认证，不是 Body 字段 | S1 |

## 3. 请求类型注册表

| ID | 触发与识别 | 认证 | Body | 响应 | 来源 |
|---|---|---|---|---|---|
| GL-EVENT | X-Gitlab-Event 对应正式事件 | A1/A2，可按配置叠加 | B1 默认事件 JSON | R1 | S1、S2 |
| GL-TEMPLATE | 配置了自定义模板；事件头仍存在 | 同上，签实际 B | B2 模板生成 JSON | R1 | S1 |
| GL-TEST | UI/API 选择某事件进行 Test | 同一 Webhook 认证 | 所选事件的结构，没有统一 Ping Schema | R1 | S1 |
| GL-RESEND | Resend Request 重投历史事件 | 仍校验认证 | 原事件数据 | R1 | S1 |

## 4. 认证契约

### A1：Signing Token / Standard Webhooks

| 项目 | 精确规则（S1） |
|---|---|
| 密钥格式 | 移除 Signing Token 的 whsec_ 前缀，对剩余文本做标准 Base64 解码 |
| 必需签名输入 | webhook-id 的原始文本、webhook-timestamp 的原始文本、B |
| 待签字节 | `UTF8(id + "." + t + ".") || B` |
| 输出 | `"v1," + B64(HMAC256(K, message))` |
| 签名头 | webhook-signature；空格分隔候选签名；匹配任一支持的 v1 候选 |
| 时间语义 | webhook-timestamp 为生成请求时的 Unix 秒；官方要求检查新鲜度，S1 未统一指定容忍秒数 |
| 密钥轮换 | 解析器允许签名列表；当前文档说目前发送一条，不以此限制未来列表长度 |

```text
K = B64DEC(remove_prefix(signing_token, "whsec_"))
M = UTF8(webhook_id + "." + webhook_timestamp + ".") || B
expected = "v1," + B64(HMAC256(K, M))
valid = any(CT_EQ(expected, candidate) for candidate in split_on_spaces(signature_header))
```

### A2：旧 Secret Token

| 项目 | 精确规则（S1） |
|---|---|
| 校验 | CT_EQ(X-Gitlab-Token, 配置的 Secret Token) |
| Body 完整性 | 不覆盖 Body；依赖 HTTPS 保护传输 |
| 与 A1 并存 | 平台允许同时配置；接收端迁移策略须显式决定是否允许回退 |
| 降级边界 | 预期 A1 的端点不能仅因签名缺失自动接受 A2/匿名 |

### 请求头

| 名称 | 出现规则/类型 | 语义 | 来源 |
|---|---|---|---|
| X-Gitlab-Event | D，string | 例如 Push Hook、Merge Request Hook | S1 |
| webhook-id | 当前 S1 描述每次请求具有 | 唯一消息 ID，重试一致，等于 Idempotency-Key | S1 |
| webhook-timestamp | 当前 S1 描述每次请求具有 | Unix 秒 | S1 |
| webhook-signature | C，配置 Signing Token | A1 候选列表 | S1 |
| X-Gitlab-Token | C，配置旧 Secret Token | A2 固定值 | S1 |
| Idempotency-Key | 历史兼容 | 与 webhook-id 等值 | S1 |
| X-Gitlab-Event-UUID | D | 递归触发的 Webhook 可共享此值，不等同唯一消息 ID | S1 |
| X-Gitlab-Webhook-UUID | D | Webhook 标识，不是每条事件去重 ID | S1 |
| X-Gitlab-Instance / User-Agent | D | 实例域名 / GitLab 版本元信息 | S1 |

## 5. 请求体契约

### B1：默认事件结构

以下为事件分发及字段路径；**非完整资源 Schema**。每行的 S2 锚点规定该事件的完整结构、版本变化和条件字段。

| X-Gitlab-Event / 类别 | 类型与关键路径 | 动作/状态路径 | 官方结构 |
|---|---|---|---|
| Push Hook | object_kind=push；ref:string、before/after:string、commits:object[]、total_commits_count:integer、project:object | 分支引用变化 | [S2 push](https://docs.gitlab.com/user/project/integrations/webhook_events/#push-events) |
| Tag Push Hook | object_kind=tag_push；ref、before、after、project | 标签引用变化 | [S2 tag](https://docs.gitlab.com/user/project/integrations/webhook_events/#tag-events) |
| Issue Hook / Work item | object_kind=issue 或 work_item；object_attributes、user、project、changes | object_attributes.action | [S2 work item](https://docs.gitlab.com/user/project/integrations/webhook_events/#work-item-events) |
| Note Hook | object_kind=note；object_attributes.note/noteable_type；关联 issue/merge_request/commit/snippet | object_attributes.action=create/update | [S2 comment](https://docs.gitlab.com/user/project/integrations/webhook_events/#comment-events) |
| Merge Request Hook | object_kind=merge_request；object_attributes、changes、user、project、assignees/reviewers/labels | object_attributes.action | [S2 MR](https://docs.gitlab.com/user/project/integrations/webhook_events/#merge-request-events) |
| Pipeline Hook | object_kind=pipeline；object_attributes、builds[]、commit、project | object_attributes.status | [S2 pipeline](https://docs.gitlab.com/user/project/integrations/webhook_events/#pipeline-events) |
| Job Hook | object_kind=build；build_id:integer、build_name:string、pipeline_id:integer | **顶层** build_status | [S2 job](https://docs.gitlab.com/user/project/integrations/webhook_events/#job-events) |
| Deployment Hook | object_kind=deployment；deployment_id、environment、deployable_id | **顶层** status | [S2 deployment](https://docs.gitlab.com/user/project/integrations/webhook_events/#deployment-events) |
| Release Hook | object_kind=release；tag、name、description、assets | **顶层** action | [S2 release](https://docs.gitlab.com/user/project/integrations/webhook_events/#release-events) |
| Wiki Page Hook | object_kind=wiki_page；object_attributes、wiki | object_attributes.action | [S2 wiki](https://docs.gitlab.com/user/project/integrations/webhook_events/#wiki-page-events) |
| Feature flag | 按该事件对象 | 不套用 MR 字段 | [S2 feature flag](https://docs.gitlab.com/user/project/integrations/webhook_events/#feature-flag-events) |
| Emoji / Milestone | 按对应事件对象 | 依各自事件 | [S2 emoji](https://docs.gitlab.com/user/project/integrations/webhook_events/#emoji-events)、[milestone](https://docs.gitlab.com/user/project/integrations/webhook_events/#milestone-events) |
| Vulnerability / Access token / Duo flow | 按各自类型 | 受版本/套餐/功能条件限制 | [S2 完整目录](https://docs.gitlab.com/user/project/integrations/webhook_events/) |
| Group member / Project / Subgroup | 组专有结构 | 依各自事件 | [S2 组事件](https://docs.gitlab.com/user/project/integrations/webhook_events/#events-triggered-for-group-webhooks-only) |

### 默认结构的明确约束

| 对象 | 约束 | 来源 |
|---|---|---|
| Push.commits | 超过 20 条提交时，仅保留最新 20 条；实际数量在 total_commits_count | S2 |
| 空提交的分支创建 | commits 可为空数组 | S2 |
| MR.object_attributes.action | open、close、reopen、update、approval、approved、unapproval、unapproved、merge | S2 |
| MR.changes | 只记录变化字段；可为空；不等同于完整当前对象 | S2 |
| MR.oldrev | update 且实际代码变化时出现 | S2 |
| MR.system_action | system=true 时提供系统触发原因 | S2 |
| Note.noteable_type | Commit / MergeRequest / Issue / Snippet 对应不同关联对象 | S2 |
| Confidential note | event_type 可为 confidential_note，不只看 Note Hook 头 | S2 |

### B2：自定义 JSON 模板

| 项目 | 规则（S1） |
|---|---|
| 编码 | 必须生成合法 JSON |
| 字段 | 由模板决定；默认 object_kind、project、object_attributes 不再保证存在 |
| 引用语法 | 用点路径访问嵌套属性；模板不能访问数组属性 |
| 认证 | 签实际发送的 B，不签模板文本，也不签默认事件对象 |
| 示例性质 | 下例为合法模板输出，不是默认 Push Schema |

```json
{ "event": "push", "project_name": "Example" }
```

## 6. 响应契约 R1

| 项目 | 精确规则 | 来源 |
|---|---|---|
| 成功状态 | UI/测试以 `200–299` 为成功；官方建议 `200` / `201` | S1 |
| Body | 可空；响应头/体保存用于排查，不要求固定业务 JSON | S1 |
| GitLab.com 超时 | 10 秒 | S3 |
| Self-Managed 超时 | webhook_timeout 可由管理员配置；不是所有实例固定 10 秒 | S4 |
| 地址验证 | 未定义 challenge 握手；Test 发送所选事件 | S1 |

## 7. 投递语义

| 项目 | 规则 | 来源 |
|---|---|---|
| 重投标识 | Resend 使用相同数据及 Idempotency-Key / webhook-id | S1 |
| 自动禁用 | 文档所列功能启用时，连续失败 4 次临时禁用；40 次永久禁用 | S1；依功能版本/开关 |
| 恢复 | 测试成功 `2xx` 可重新启用 | S1 |
| 重复来源 | 项目与组同时订阅时可收到同一活动的两份投递 | S1 |
| .com Payload 上限 | 25 MB | S3 |
| 全局顺序 | 所列资料未提供严格全局顺序保证 | S1、S2 |

## 8. 官方来源

| 编号 | 来源 | 约束范围 |
|---|---|---|
| S1 | [Webhooks](https://docs.gitlab.com/user/project/integrations/webhooks/) | 配置、签名、头、测试、确认与禁用 |
| S2 | [Webhook events](https://docs.gitlab.com/user/project/integrations/webhook_events/) | 项目/组事件及结构 |
| S3 | [GitLab.com Webhook limits](https://docs.gitlab.com/user/gitlab_com/#webhooks) | .com 的 10 秒及 Payload 限制 |
| S4 | [Instance limits](https://docs.gitlab.com/administration/instance_limits/#webhook-timeout) | Self-Managed 超时配置 |
