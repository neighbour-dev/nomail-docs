---
title: Stripe Webhook 验签、事件格式与授权响应协议 | NoMail
description: 区分 Stripe Snapshot、Thin 通知和 Issuing 实时授权，查阅带时间戳签名、事件字段、同步决策响应以及重试、轮换和去重语义。
---

# Stripe Webhook 协议

[平台索引](../webhook-platform-reference-2026-10-30.md) · [约束标记与算法符号](../webhook-contract-conventions.md)

## 1. 范围与版本

| 项目 | 定义 |
|---|---|
| 核对日期 | 2026-11-08 |
| 传输 | HTTP POST + JSON；注册的公网端点使用 HTTPS，支持 TLS 1.2/1.3（S1） |
| Payload 模式 | Snapshot Event / Thin EventNotification；分别配置目的地 |
| 版本边界 | Snapshot 按 API 版本序列化；Thin 通知不按 Snapshot 的 API 版本固定资源快照（S2） |
| 出站 API | 获取完整 Event / 资源时才需要 API Key；不属于入站验签凭据 |

## 2. 配置参数

| 参数 | 约束 | 协议影响 | 来源 |
|---|---|---|---|
| Endpoint URL | 公网 HTTPS；本地 CLI 转发可用 HTTP | 投递目标 | S1 |
| Payload format | snapshot / thin | B1 / B2 | S1、S2 |
| Event types | 按模式的事件目录订阅 | Body.type 的值域 | S1、S2 |
| API version | Snapshot 目的地版本 | data.object 的资源 Schema | S2 |
| Signing Secret | 每个端点及环境独立，通常以 whsec_ 开头 | A1；**原文使用，不去前缀解码** | S1 |
| 来源范围 | 自己账号、Connected accounts、组织等 | account/context 等上下文 | S1 |
| CLI Signing Secret | stripe listen 输出值 | 仅对应 CLI 转发，不混用注册端点密钥 | S1 |

## 3. 请求类型注册表

| ID | 识别条件 | 认证 | Body | 响应 | 来源 |
|---|---|---|---|---|---|
| ST-SNAPSHOT | Snapshot 目的地；object=event | A1 | B1 | R1 | S1、S2 |
| ST-THIN | Thin 目的地；通知类型见 S2 | A1 | B2 | R1 | S1、S2 |
| ST-TEST | 沙箱/CLI 触发对应事件；不是统一 test 类型 | A1，密钥取对应环境 | B1/B2 | R1 | S1 |
| ST-RETRY | 相同事件再次投递 | A1，本次生成的新时间戳/签名 | 原事件 | R1 | S1 |
| ST-ISSUING | 专用实时授权；type=issuing_authorization.request | A1，专用端点 Secret | B3 | **R2** | S4 |

## 4. 认证契约 A1

| 输入 | 类型/格式 | 约束 |
|---|---|---|
| Signing Secret | UTF-8 文本 | 包括 whsec_ 前缀的完整原文作为 K |
| Stripe-Signature | 逗号分隔的 key=value 项 | t 为时间戳，v1 为签名；可有多个 v1 |
| t | Unix 秒的原始文本 | 参与签名时保留原文本 |
| B | 原始 HTTP Body 字节 | 不可 JSON 解析后重新序列化 |

```text
M = UTF8(t + ".") || B
expected = HEX(HMAC256(UTF8(signing_secret), M))
valid_signature = any(CT_EQ(expected, v1_candidate))
```

| 检查项 | 精确规则 | 来源 |
|---|---|---|
| 支持方案 | 仅验证 v1；测试请求可能有伪造的 v0，忽略 v0 | S1 |
| 候选编码 | v1 值为 64 位十六进制，不带 sha256= | S1 |
| 时间容忍 | 官方 SDK 默认 300 秒；可配置；不能称为所有接收端强制固定值 | S1 |
| tolerance=0 | 官方库中表示禁用新鲜度检查，**不是零容忍** | S1 |
| 重试 | 每次发送重新生成 t 与签名，不能拿旧签名串作为事件去重键 | S1 |
| 轮换 | 旧 Secret 可延迟最多 24 小时失效；活跃密钥各自产生签名 | S1 |
| 认证失败 | 不处理事件；S1 示例返回 `400` | S1（示例，不作为唯一允许错误码） |

## 5. 请求体契约

### B1：Snapshot Event 信封

S3 的 Attributes 定义类型及 nullable，但未逐项列出所有序列化场景的 Required 标记；以下用 D/C，不把“非 nullable”自动等同于“绝不省略”。

| 路径 | 类型 | 出现/值约束 | 语义 |
|---|---|---|---|
| id | string | D | Event ID |
| object | string | D，固定 event | 对象种类 |
| type | string | D | 事件类型，如 invoice.paid |
| created | integer timestamp | D，Unix 秒 | 事件创建时间，不是提交序号 |
| api_version | string或null | D；2014-10-31 及之后创建的事件才填充 | data 的序列化版本 |
| data | object | D | 事件数据容器 |
| data.object | object | 对应事件定义 | 发生事件时的资源快照 |
| data.previous_attributes | object | C，提供变更前值的更新事件 | 不是完整旧资源 |
| livemode | boolean | D | 正式或测试环境 |
| pending_webhooks | integer | D | 未成功投递的端点数 |
| request | object或null | D | 触发事件的 API 请求元数据 |
| account | string或null | C，相关 Connected account | 来源账号 |
| context | string或null | D，按来源范围/事件提供 | 补查 API 的认证上下文 |

### B2：Thin 通知与完整 Event 分离

| 字段 | 初始通知 | 补查的完整 Event | 类型/条件 | 来源 |
|---|---|---|---|---|
| id / type | 有 | 有 | string；事件标识/类型 | S2、S5 |
| object | S2 示例为 v2.core.event | v2.core.event | string | S2、S5 |
| created | 有 | 有 | 时间字符串，S2/S5 示例为 RFC3339 小数秒 | S2、S5 |
| livemode | 有 | 有 | boolean | S2、S5 |
| context | 按事件提供 | 可 null | string或null | S2、S5 |
| reason | 按事件提供 | 可 null | object或null | S2、S5 |
| related_object | 有关联资源时提供 | 可 null | id:string、type:string、url:string | S2、S5 |
| data | **不随轻量通知提供完整数据** | 可提供 | object或null；按事件 | S2 |
| changes | **不随轻量通知提供** | 可提供 | object或null | S2 |
| snapshot_event | 不作为所有通知的必填项 | 有对应 Snapshot 时可提供 | string或null | S5 |

### 业务类型分发

| 模式 | 类型判定 | 资源读取 | 完整 Schema |
|---|---|---|---|
| Snapshot | type | data.object；按资源 object/API 版本解析 | [Snapshot 事件目录](https://docs.stripe.com/api/events/types) |
| Thin | type | related_object；可用 Event ID 补查完整 Event | [Thin 事件目录](https://docs.stripe.com/api/v2/core/events/event-types) |
| Thin 资源不存在 | 某些事件没有 related_object | 不强制调用 fetchRelatedObject | S1、S2 |
| Connect/组织 | account/context | API 请求携带对应账号/上下文 | S1 |

### B3：Issuing 实时授权

| 路径 | 类型 | 协议含义 | 来源 |
|---|---|---|---|
| type | string | issuing_authorization.request | S4 |
| data.object | Issuing Authorization | 不等同普通通知的收件对象 | S4 |
| data.object.status | string | 待决定时 pending | S4 |
| data.object.approved | boolean | 待决定示例为 false，不是既定拒绝结论 | S4 |
| data.object.amount | integer | 待授权时为 0；不能当作本次待授权金额 | S4 |
| data.object.pending_request | object | 待决策请求 | S4 |
| pending_request.amount / currency | integer / string | 本次金额与币种 | S4 |
| pending_request.is_amount_controllable | boolean | true 时允许响应 amount 控制金额 | S4 |

## 6. 响应契约

### R1：普通通知

| 项目 | 精确规则 | 来源 |
|---|---|---|
| 成功状态 | `2xx` | S1 |
| Body | 未规定统一业务 JSON | S1 |
| 时限 | S1 要求尽快返回；未给出所有普通通知统一秒数 | S1 |
| 重定向 | `3xx` 视为失败，不作为成功确认 | S1 |
| challenge | 无通用 challenge 握手 | S1 注册/接收流程 |

### R2：Issuing 同步决策

| 部位 | 约束 | 必填性 | 来源 |
|---|---|---|---|
| HTTP status | `200` | R | S4 |
| Stripe-Version 响应头 | 有效的 Stripe API 版本 | R | S4 |
| Content-Type 响应头 | 如发送则只接受 application/json | O | S4 |
| 响应 Body.approved | boolean；批准/拒绝 | R | S4 |
| 响应 Body.amount | 正整数；仅 pending_request.is_amount_controllable=true 时 | O/C | S4 |
| 响应 Body.metadata | 键值对 | O | S4 |
| 响应 Body.send_fraud_challenges | 按 S4 预览功能约束 | O，受预览资格限制 | S4 |
| 完成时限 | 2 秒 | R | S4 |
| 超时/错误 | 按 timeout / Autopilot 配置决定授权结果 | 配置相关 | S4 |

```http
HTTP/1.1 200 OK
Content-Type: application/json
Stripe-Version: 2025-03-31.basil
```

```json
{ "approved": false }
```

### 普通 ACK 的业务影响

| 场景 | 影响 | 来源 |
|---|---|---|
| account 级 invoice.created | 确认失败可影响自动 finalization 时机 | S1 链接的 Billing 规则 |
| 部分 Checkout 场景 | 确认可能影响跳转等待 | S1 链接的 Checkout 规则 |
| 组织目的地 | 不支持订阅 issuing_authorization.request；部分 Checkout/Billing 等待行为不同 | S1 Organization 限制 |

## 7. 投递语义

| 项目 | 规则 | 来源 |
|---|---|---|
| 正式自动重试 | 最长 3 天，指数退避 | S1 |
| 沙箱自动重试 | 数小时内重试 3 次 | S1 |
| 人工重投 | Dashboard 事件创建后 15 天内；CLI 30 天内 | S1 |
| 人工重投与自动重试 | 人工重投成功不会自动取消原自动重试流程 | S1 |
| 重复/乱序 | 可能重复；不保证生成顺序投递 | S1 |
| 去重标识 | id 识别事件；相同资源+type 仍可能有不同事件，应区分业务幂等 | S1 |

## 8. 官方来源

| 编号 | 来源 | 约束范围 |
|---|---|---|
| S1 | [Receive Stripe events](https://docs.stripe.com/webhooks) | HTTP、签名、重试、组织限制 |
| S2 | [How events work](https://docs.stripe.com/events/how-events-work) | Snapshot/Thin 通知与完整对象区别 |
| S3 | [Snapshot Event object](https://docs.stripe.com/api/events/object) | 字段类型与 nullable |
| S4 | [Issuing real-time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations) | 授权 Body、响应、2 秒时限 |
| S5 | [Events v2 object](https://docs.stripe.com/api/v2/core/events/object) | 完整 Thin Event 属性 |
