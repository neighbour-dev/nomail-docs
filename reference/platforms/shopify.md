# Shopify

[平台索引](../webhook-platform-reference-2026-10-30.md) · [约束标记与算法符号](../webhook-contract-conventions.md)

## 1. 范围与版本

| 项目 | 定义 |
|---|---|
| 核对日期 | 2026-11-08 |
| 适用 | 应用 Webhook 的 HTTPS 投递；HTTP POST + JSON |
| 排除 | EventBridge/PubSub 消息封装；商家后台手工创建通知的专用密钥来源 |
| 版本 | 以实际 X-Shopify-API-Version 对应的 topic Schema 解释 Body |
| 资源结构 | 默认采用主题的 REST 资源形状；不是 GraphQL 查询结果，也不是统一 data/event 包装 |

## 2. 配置参数

| 参数 | 类型/约束 | 协议影响 | 来源 |
|---|---|---|---|
| topics / topic | topic 字符串/GraphQL 枚举；如 orders/create / ORDERS_CREATE | 订阅事件 | S5、S6 |
| uri | HTTPS 完整 URL；应用开发配置可为相对路径 | 投递地址 | S2、S5 |
| api_version | 应用级 webhooks.api_version；店铺级由创建订阅的 API 版本决定 | 序列化 Schema | S5 |
| App Client Secret | 应用共享密钥原文 | A1；不是店铺 Admin API Access Token | S2 |
| include_fields / includeFields | O，字段路径数组；嵌套路径用点分隔 | P2 字段裁剪 | S1 |
| filter | O，过滤表达式 | 控制是否投递，不改变签名算法 | S1、S5 |
| name | O | 可进入 X-Shopify-Name | S1 |
| compliance_topics | 合规主题列表 | SH-DATA / CUSTOMER-REDACT / SHOP-REDACT | S3 |

## 3. 请求类型注册表

| ID | X-Shopify-Topic / 触发 | 认证 | Body | 响应 |
|---|---|---|---|---|
| SH-RESOURCE | products/update、orders/create 等资源主题 | A1 | P1；有裁剪时 P2 | R1 |
| SH-DELETE | products/delete 等删除主题 | A1 | 对应删除 Schema；不能套完整资源 | R1 |
| SH-UNINSTALL | app/uninstalled | A1 | 该 topic 的店铺/应用生命周期结构 | R1 |
| SH-DATA | customers/data_request | A1 | P3 | R2 |
| SH-CUSTOMER-REDACT | customers/redact | A1 | P4 | R2 |
| SH-SHOP-REDACT | shop/redact | A1 | P5 | R2 |
| SH-CLI | CLI 为指定 topic 生成样例 | A1，按 CLI 的 Client Secret | 对应 topic 的固定样例 | R1，CLI 失败不重试 |

## 4. 认证契约 A1

| 项目 | 精确规则 | 来源 |
|---|---|---|
| 密钥 K | UTF8(App Client Secret 原文) | S2 |
| 签名头 | X-Shopify-Hmac-Sha256；标准 Base64，不是 Hex | S2 |
| 计算 | `expected = B64(HMAC256(K, B))` | S2 |
| 比较 | 解码后字节或编码后文本作常量时间比较 | S2 |
| 签名输入 | 完整原始 JSON Body；不做解析后重序列化 | S2 |
| 未覆盖头 | Topic、Shop-Domain、API-Version、Webhook-Id 等不在上述签名输入中 | S2 算法定义 |
| 时间窗口 | 此算法不含签名时间戳；Triggered-At 不是被 HMAC 覆盖的时间认证 | S1、S2 |
| 轮换 | Client Secret 轮换后，最长可能需 1 小时才改用新 Secret 生成摘要 | S2 |
| API 凭据区别 | 不使用 OAuth 回调 query HMAC 算法或店铺 Access Token | S2 |

### 请求头

| 名称 | 类型/语义 | 条件 | 来源 |
|---|---|---|---|
| X-Shopify-Topic | string；资源主题 | HTTPS 投递元信息 | S1 |
| X-Shopify-Hmac-Sha256 | Base64 string | HTTPS 来源校验 | S1、S2 |
| X-Shopify-Shop-Domain | string；myshopify.com 域名 | 店铺上下文 | S1 |
| X-Shopify-API-Version | string | 实际序列化版本 | S1 |
| X-Shopify-Webhook-Id | string | 单条投递去重键 | S1、S2 |
| X-Shopify-Event-Id | string | 同一商家操作产生的多个投递共享 | S1、S2 |
| X-Shopify-Triggered-At | timestamp 文本 | 触发时间元信息 | S1 |
| X-Shopify-Name | string | O，配置订阅 name 时 | S1 |

## 5. 请求体契约

### P1：资源主题

| 主题 | Body 结构投影 | 约束/完整定义 |
|---|---|---|
| products/create、products/update | id:integer、title:string、status:string、variants:object[]、updated_at:时间字符串 | S1 示例；完整字段按 S6 对应版本 |
| products/delete | id:integer 等该主题删除字段 | 不要求 title/variants；S6 |
| orders/create、orders/updated | id、金额、订单状态、line_items 等 | 按 S6，不将产品字段套给订单 |
| app/uninstalled | 对应主题对象 | 与 shop/redact 不同；S6 |
| 其他主题 | 每个 topic 的资源或专用对象 | S6 完整主题目录 |

| 字段处理 | 约束 |
|---|---|
| 数据类型 | price 等金额字段可为字符串；以主题 Schema 为准 |
| 包装 | Body 直接为资源/专用对象，不添加 event/data.object |
| 必填性 | 资源字段受版本、权限、主题及裁剪影响；不从产品示例推导所有资源必填 |

### P2：include_fields 裁剪

| 条件 | 精确结果 | 来源 |
|---|---|---|
| 不配置 include_fields | 默认包含对应主题的完整资源 Payload | S1 |
| 配置 include_fields | 仅投递选择的字段路径；嵌套对象/数组保留相关部分 | S1 |
| 与 filter 同用 | filter 引用的字段也必须包含在 include_fields 中 | S1 |
| 多次事件裁剪后相同 | 短窗口内可去抖，后来的相同 Payload 被丢弃 | S1 |
| 避免相同投影合并 | S1 建议包含 updated_at 等变化字段 | S1（建议，不是字段全局必填） |

裁剪后的产品更新示例（不是完整产品 Schema）：

```json
{
  "id": 123456789,
  "variants": [{ "id": 987654321, "price": "19.99" }],
  "updated_at": "2026-11-08T00:00:00Z"
}
```

### P3–P5：合规请求（S3）

S3 给出官方 Payload 示例及用途，未逐字段提供一份通用 Required/Optional 表。以下类型按示例记为 E/D；customer 字段另有明确条件，不能将示例全部提升为必填。

| 字段 | 类型 | customers/data_request | customers/redact | shop/redact |
|---|---|---|---|---|
| shop_id | integer | 店铺 ID | 店铺 ID | 店铺 ID |
| shop_domain | string | 店铺域名 | 店铺域名 | 店铺域名 |
| customer | object | 请求访问的客户 | 请求删除的客户 | — |
| customer.id | integer | 按客户记录提供；不能强制所有请求具有 | 同左 | — |
| customer.email / phone | string | 按客户记录；S3 明确有时只有 email | 同左 | — |
| orders_requested | integer[] | 要提供数据的订单 ID | — | — |
| data_request.id | integer | 访问请求 ID | — | — |
| orders_to_redact | integer[] | — | 要删除/脱敏的订单 ID | — |

| 类型 | 触发/业务义务 | 来源 |
|---|---|---|
| customers/data_request | 客户申请访问数据；将应用存储的相关数据提供给店主，不是在 ACK Body 返回个人数据 | S3 |
| customers/redact | 客户删除请求；按 IDs 清理数据；S3 记录通常在删除请求 10 天后发送，计划礼品卡可延后 | S3 |
| shop/redact | 店主卸载应用 48 小时后通知清理店铺数据 | S3 |

## 6. 响应契约

| ID | 项目 | 精确规则 | 来源 |
|---|---|---|---|
| R1 | 成功状态 | `2xx`；官方表述优先 `200 OK` | S2 |
| R1 | 建连时限 | 1 秒 | S2 |
| R1 | 请求总时限 | 5 秒，包括建立连接及处理 | S2 |
| R1 | Body | 无固定业务 JSON，不能要求 challenge 回显 | S2 接收流程 |
| R1 | 重定向 | `3xx` 是失败 | S2 |
| R2 | 合规成功确认 | `2xx`；确认收到，不表示已完成数据处理 | S3 |
| R2 | 合规非法 HMAC | **401 Unauthorized** | S3 |
| R2 | 完成业务 | 收到后 30 天内执行；法律要求保留数据时依 S3 的例外 | S3 |

## 7. 投递语义

| 项目 | 精确规则 | 来源 |
|---|---|---|
| 重试 | 失败后在后续 4 小时内重试 8 次 | S2 |
| 删除订阅 | S2 对 Admin API 配置的订阅描述连续失败后自动删除；不扩大到所有管理方式 | S2 |
| 单条投递去重 | 使用 X-Shopify-Webhook-Id | S2 |
| 业务操作关联 | 多订阅产生不同 Webhook-Id，但可共享 Event-Id | S2 |
| CLI 样例 | 相同 topic 为固定样例；不能覆盖不同内容场景 | S4 |
| CLI 失败 | 不自动重试 | S4 |
| CLI 签名 | client-secret 参数用于生成可验证的 HMAC | S4 |
| CLI 验证范围 | 不验证实际 API 订阅；端到端验证需真实触发店铺活动 | S4 |

## 8. 官方来源

| 编号 | 来源 | 约束范围 |
|---|---|---|
| S1 | [Delivery structure](https://shopify.dev/docs/apps/build/webhooks/delivery-structure) | 头、资源格式、裁剪、去抖 |
| S2 | [Verify deliveries](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries) | HMAC、时限、重试 |
| S3 | [Privacy law compliance](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance) | 三种合规 Payload、401、30 天 |
| S4 | [CLI webhook trigger](https://shopify.dev/docs/api/shopify-cli/app/app-webhook-trigger) | 测试签名、固定样例、无重试 |
| S5 | [Subscribe](https://shopify.dev/docs/apps/build/webhooks/subscribe/) | 订阅字段及版本 |
| S6 | [Webhooks reference](https://shopify.dev/docs/api/webhooks) | 各 topic 完整资源 Schema |
