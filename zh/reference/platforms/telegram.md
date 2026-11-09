---
title: Telegram Bot Webhook 与 Update 请求响应协议 | NoMail
description: 查阅 Telegram setWebhook、Secret Token、Update 类型、消息与查询字段，区分 HTTP 确认和按钮、内联搜索、配送及结账业务应答。
---

# Telegram Bot API Webhook 协议

[平台索引](../webhook-platform-reference-2026-10-30.md) · [约束标记与算法符号](../webhook-contract-conventions.md)

## 1. 范围与版本

| 项目 | 定义 |
|---|---|
| 核对日期 | 2026-11-08 |
| 入站传输 | Telegram → 接收端：HTTPS POST + JSON Update |
| 入站信封 | 每次一个 Update 对象，不是数组，不包 ok/result |
| 出站方向 | 接收端 → Bot API：URL 中携带 Bot Token；与入站 Secret Token 不同 |
| 版本边界 | Update 字段按核对日 S2；新增字段不改变现有信封 |
| 云端/本地 | Local Bot API Server 有不同 URL/端口/HTTP 能力，另列配置差异 |

## 2. setWebhook 配置契约

| 参数 | 类型 | 必填性 | 约束 | 来源 |
|---|---|---|---|---|
| url | string | R | 云端 HTTPS；空字符串删除 Webhook | S1 |
| secret_token | string | O | 1–256 字符，仅 A–Z、a–z、0–9、下划线、短横线 | S1 |
| allowed_updates | string[] | O | 省略沿用上次设置；空数组默认排除 chat_member、message_reaction、message_reaction_count | S1 |
| max_connections | integer | O | 云端 1–100，默认 40 | S1 |
| ip_address | string | O | 指定发送连接的固定 IP，替代 DNS 解析结果 | S1 |
| certificate | InputFile | O/C | 自签名场景上传公钥证书，不上传私钥，不使用普通字符串代替文件 | S1 |
| drop_pending_updates | boolean | O | true 丢弃已排队更新 | S1 |

| 传输限制 | 云端 | Local Server | 来源 |
|---|---|---|---|
| HTTP | 不支持；端口 80 也仍需 HTTPS | 可使用 HTTP | S1、S3 |
| 端口 | 443、80、88、8443 | 任意端口 | S1、S3 |
| 地址 | 公网接收地址 | 可使用本地 IP | S3 |
| 接收方式 | Webhook 与 getUpdates 互斥 | 同样按 Bot 接收模式配置 | S1 |

## 3. 请求类型注册表

| ID | 识别 | 认证 | Body | HTTP 响应 | 业务应答 |
|---|---|---|---|---|---|
| TG-NOTIFY | Update 中为消息/状态/通知字段 | A1 或未配置认证的 A0 | P1 + 对应对象 | R1 | 按功能可另调 API |
| TG-CALLBACK | callback_query | 同上 | P3 | R1 | R2 answerCallbackQuery |
| TG-INLINE | inline_query | 同上 | P4 | R1 | R3 answerInlineQuery |
| TG-SHIPPING | shipping_query | 同上 | P5 | R1 | R4 answerShippingQuery |
| TG-PRECHECKOUT | pre_checkout_query | 同上 | P6 | R1 | R5 answerPreCheckoutQuery，10 秒 |
| TG-RETRY | 原 Update 重投 | 同上 | 相同 update_id | R1 | 不重复执行业务 |

## 4. 认证契约

| ID | 条件 | 入站凭据 | 校验 | 来源 |
|---|---|---|---|---|
| A0 | 未配置 secret_token | 不发送标准 Secret Token 头 | 平台没有该应用层认证 | S1 |
| A1 | 配置 secret_token | X-Telegram-Bot-Api-Secret-Token | 与预存值常量时间比较 | S1；比较方式为安全实现要求 |

| 项目 | 精确边界 |
|---|---|
| Body 签名 | Bot API 未定义通用入站 Update HMAC；A1 不绑定 Body |
| 时间戳签名 | 没有通用的逐请求签名时间戳 |
| TLS | 用于传输保护；不能用 User-Agent 取代 Secret Token |
| Bot Token | 出站 API 授权凭据，不要求出现在入站 Body/认证头中 |
| Passport 等业务加密 | 某些业务数据有自身加密结构，不等同所有 Update 外层加密 |

## 5. 请求体契约

### P1：Update 信封（S2）

| 路径 | 类型 | 必填性 | 约束 |
|---|---|---|---|
| update_id | integer | R | 更新标识，按 Bot 作用域使用 |
| 下面列出的更新字段 | 对应对象 | O，字段间互斥 | 一次 Update **最多一个**可选更新字段 |

### Update 字段注册表

下表列出核对日 S2 的全部可选更新字段；对象名称链接到官方类型，不将 Message 模型用于所有字段。

| 顶层字段 | 对象类型 | 业务语义/条件 |
|---|---|---|
| message | [Message](https://core.telegram.org/bots/api/types/message.md) | 新消息，正文不限文本 |
| edited_message | Message | 已知消息的修订 |
| channel_post | Message | 频道新消息 |
| edited_channel_post | Message | 频道消息修订 |
| business_connection | [BusinessConnection](https://core.telegram.org/bots/api/types/businessconnection.md) | 商业账号连接变化 |
| business_message | Message | 商业账号消息 |
| edited_business_message | Message | 商业消息修订 |
| deleted_business_messages | [BusinessMessagesDeleted](https://core.telegram.org/bots/api/types/businessmessagesdeleted.md) | message_ids[]，不是被删除正文 |
| guest_message | Message | 访客消息；guest_query_id 可用于专用回复 |
| message_reaction | [MessageReactionUpdated](https://core.telegram.org/bots/api/types/messagereactionupdated.md) | 管理员且显式订阅；不包含 Bot 设置的反应 |
| message_reaction_count | [MessageReactionCountUpdated](https://core.telegram.org/bots/api/types/messagereactioncountupdated.md) | 管理员且显式订阅；可聚合延迟数分钟 |
| inline_query | [InlineQuery](https://core.telegram.org/bots/api/types/inlinequery.md) | 内联搜索请求 |
| chosen_inline_result | [ChosenInlineResult](https://core.telegram.org/bots/api/types/choseninlineresult.md) | 用户选择结果，需要启用反馈收集 |
| callback_query | [CallbackQuery](https://core.telegram.org/bots/api/types/callbackquery.md) | 按钮/游戏回调 |
| shipping_query | [ShippingQuery](https://core.telegram.org/bots/api/types/shippingquery.md) | 灵活配送报价询问 |
| pre_checkout_query | [PreCheckoutQuery](https://core.telegram.org/bots/api/types/precheckoutquery.md) | 结账前确认 |
| purchased_paid_media | [PaidMediaPurchased](https://core.telegram.org/bots/api/types/paidmediapurchased.md) | 付费媒体购买通知 |
| poll | [Poll](https://core.telegram.org/bots/api/types/poll.md) | 投票状态，受该类型投递条件限制 |
| poll_answer | [PollAnswer](https://core.telegram.org/bots/api/types/pollanswer.md) | 非匿名投票答案变化 |
| my_chat_member | [ChatMemberUpdated](https://core.telegram.org/bots/api/types/chatmemberupdated.md) | Bot 自身成员状态；私聊为被屏蔽/解除屏蔽 |
| chat_member | ChatMemberUpdated | 管理员且显式 allowed_updates |
| chat_join_request | [ChatJoinRequest](https://core.telegram.org/bots/api/types/chatjoinrequest.md) | 需 can_invite_users 权限 |
| chat_boost | [ChatBoostUpdated](https://core.telegram.org/bots/api/types/chatboostupdated.md) | 管理员接收 Boost 更新 |
| removed_chat_boost | [ChatBoostRemoved](https://core.telegram.org/bots/api/types/chatboostremoved.md) | Boost 移除 |
| managed_bot | [ManagedBotUpdated](https://core.telegram.org/bots/api/types/managedbotupdated.md) | 托管 Bot 创建/Token/所有者变化 |
| subscription | [BotSubscriptionUpdated](https://core.telegram.org/bots/api/types/botsubscriptionupdated.md) | 用户支付订阅变化 |
| stopped_message_generation | [MessageGenerationStopped](https://core.telegram.org/bots/api/types/messagegenerationstopped.md) | 用户停止消息生成 |

### P2：Message 的稳定字段与内容变体

此表为 Message 的接收投影，不替代 S4 的完整字段表。

| 路径 | 类型 | 必填性 | 条件/语义 |
|---|---|---|---|
| message_id | integer | R | 聊天内消息 ID；不是全 Bot 事件 ID |
| date | integer | R | Unix 秒 |
| chat | Chat | R | 对话信息 |
| from | User | O | 频道消息等场景可没有 |
| sender_chat | Chat | O | 以聊天身份发送 |
| text / entities | string / MessageEntity[] | O | 文本消息内容和实体 |
| photo / document / sticker / video / audio / voice 等 | 对应媒体对象 | O | 文件引用；不是直接二进制 Body |
| caption / caption_entities | string / MessageEntity[] | O | 媒体标题/实体 |
| 服务消息字段 | 对应类型 | O | 成员、话题、支付等变化；不要求 text |

### P3–P6：需要业务应答的对象

| 对象 | 字段 | 类型/必填性 | 条件/语义 |
|---|---|---|---|
| CallbackQuery | id / from / chat_instance | string / User / string，R | 查询 ID、用户、聊天实例 |
| CallbackQuery | message | MaybeInaccessibleMessage，O | 来自 Bot 自己发送的消息按钮 |
| CallbackQuery | inline_message_id | string，O | 内联模式消息 |
| CallbackQuery | data / game_short_name | string，O，二者恰有一个 | 按钮数据或游戏名 |
| InlineQuery | id / from / query / offset | string / User / string / string，R | query 可为空 |
| InlineQuery | chat_type / location | string / Location，O | 按上下文提供 |
| ShippingQuery | id / from / invoice_payload / shipping_address | string / User / string / ShippingAddress，R | 配送条件 |
| PreCheckoutQuery | id / from / currency / total_amount / invoice_payload | string / User / string / integer / string，R | 金额为最小货币单位整数；币种可为 XTR |
| PreCheckoutQuery | shipping_option_id / order_info | string / OrderInfo，O | 配送选项/订单信息 |

依据：S5–S8 及各官方类型；其中 CallbackQuery.message 即使出现也不保证完整可访问。

## 6. 响应契约

### R1：HTTP 确认

| 项目 | 精确规则 | 来源 |
|---|---|---|
| 成功状态 | `2XY`，即 `200–299` | S1 |
| Body | 无固定 ACK JSON，可空；不要求返回 ok/result | S1、S3 |
| 地址验证 | 无通用 challenge 交换 | S1 的配置/接收流程 |
| 响应秒数 | S1 未规定所有 Update 的统一 HTTP 响应秒数 | S1 |
| 与业务应答关系 | HTTP ACK 不代替 R2–R5 | S5–S8 |

### R2–R5：出站 Bot API 业务应答

这些方法通过 Bot Token 授权的 API 调用，不是向入站请求回显查询对象。

| ID / 方法 | 必需参数 | 条件参数 | 限制/语义 | 来源 |
|---|---|---|---|---|
| R2 answerCallbackQuery | callback_query_id:string | text、show_alert、url、cache_time 按方法 | 即使不显示文字，也需应答以结束按钮等待状态 | S5 |
| R3 answerInlineQuery | inline_query_id:string、results:InlineQueryResult[] | cache_time、is_personal、next_offset、button | 最多 50 个结果；next_offset 最多 64 字节 | S7 |
| R4 answerShippingQuery | shipping_query_id:string、ok:boolean | ok=true 需 shipping_options；false 需 error_message | 提供配送报价或拒绝原因 | S8 |
| R5 answerPreCheckoutQuery | pre_checkout_query_id:string、ok:boolean | ok=false 时 error_message 必填 | 查询发送后 **10 秒内**完成决策 | S6 |

### 在 HTTP 响应中附带一次 Bot 方法调用

| 项目 | 精确规则（S3） |
|---|---|
| Content-Type | application/json、application/x-www-form-urlencoded 或 multipart/form-data |
| method | 要调用的 Bot API 方法名 |
| 其他字段 | 对应方法的参数 |
| 可观测性 | 无法通过这个响应读取调用是否成功或结果；需要结果时单独调用 API |

```json
{ "method": "answerCallbackQuery", "callback_query_id": "example-query", "text": "已收到" }
```

## 7. 投递语义

| 项目 | 精确规则 | 来源 |
|---|---|---|
| 失败重试 | 非 `2XY` 时重试，达到合理尝试次数后放弃；S1 未公开固定次数/退避表 | S1 |
| 更新保留 | Telegram 待接收更新最长保存 24 小时 | S3 |
| update_id | 通常递增；至少一周没有更新后，下一个 ID 随机选择，不能永久假设连续 | S2 |
| 去重作用域 | Bot 身份 + update_id；不同 Bot 的相同整数不能合并 | S2；作用域组合为接收端策略 |
| allowed_updates | 不影响调用之前已创建的更新，短时间仍可能收到旧类型 | S1 |
| 模式互斥 | 配置 Webhook 时不能使用 getUpdates | S1 |

## 8. 官方来源

| 编号 | 来源 | 约束范围 |
|---|---|---|
| S1 | [setWebhook](https://core.telegram.org/bots/api/methods/setwebhook.md) | 配置、Secret Token、成功状态与重试 |
| S2 | [Update](https://core.telegram.org/bots/api/types/update.md) | 完整信封字段、互斥、更新 ID |
| S3 | [Bot API](https://core.telegram.org/bots/api) | 传输、更新保留、Local Server、响应附带调用 |
| S4 | [Message](https://core.telegram.org/bots/api/types/message.md) | 消息字段 |
| S5 | [CallbackQuery](https://core.telegram.org/bots/api/types/callbackquery.md) · [answerCallbackQuery](https://core.telegram.org/bots/api/methods/answercallbackquery.md) | 按钮与应答 |
| S6 | [PreCheckoutQuery](https://core.telegram.org/bots/api/types/precheckoutquery.md) · [answerPreCheckoutQuery](https://core.telegram.org/bots/api/methods/answerprecheckoutquery.md) | 结账字段与 10 秒时限 |
| S7 | [InlineQuery](https://core.telegram.org/bots/api/types/inlinequery.md) · [answerInlineQuery](https://core.telegram.org/bots/api/methods/answerinlinequery.md) | 内联搜索及结果 |
| S8 | [ShippingQuery](https://core.telegram.org/bots/api/types/shippingquery.md) · [answerShippingQuery](https://core.telegram.org/bots/api/methods/answershippingquery.md) | 配送询问 |
