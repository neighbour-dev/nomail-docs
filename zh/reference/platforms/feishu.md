---
title: 飞书事件订阅、加密验签与卡片回调协议 | NoMail
description: 查阅飞书地址验证、v1/v2 事件、新旧卡片回调与链接预览的 Token、签名、AES-CBC 加密、字段结构、同步响应和重试规则。
---

# 飞书 Webhook 事件与回调协议

[平台索引](../webhook-platform-reference-2026-10-30.md) · [约束标记与算法符号](../webhook-contract-conventions.md)

## 1. 范围与版本

| 项目 | 定义 |
|---|---|
| 核对日期 | 2026-11-08 |
| 传输 | HTTP POST + JSON；事件地址与回调地址各自配置 |
| 覆盖 | 地址验证、v1/v2 事件、新版卡片、旧版卡片、链接预览 |
| 排除 | 长连接、向自定义群机器人发消息的 Webhook |
| 版本区分 | 事件信封 schema=2.0、事件名 im.message.receive_v1、卡片 JSON 版本是三种不同版本 |

## 2. 配置参数

| 参数 | 平台约束 | 用途 | 来源 |
|---|---|---|---|
| 请求地址 | HTTP/HTTPS IPv4 公网地址；每应用一个事件地址、一个回调地址 | POST 目的地 | S1、S3 |
| Verification Token | 应用后台生成 | 明文 token 校验；旧卡片签名使用此值 | S1、S3、S7 |
| Encrypt Key | O；配置后普通事件/新版回调以 encrypt 包装 | AES 密钥派生与 A2 签名 | S1、S3 |
| 事件/回调订阅 | 各自选择、授权及发布 | 决定收到的事件/交互种类 | S1、S2、S3 |
| App Secret | 管理/API 凭据 | **不等于** Verification Token 或 Encrypt Key | S1、S3 |

## 3. 请求类型注册表

| ID | 识别条件（必要时解密后） | 来源校验 | Body | 响应 | 来源 |
|---|---|---|---|---|---|
| FS-VERIFY-PLAIN | 顶层 type=url_verification | token 与配置值比较；地址验证不套普通事件签名头要求 | P1 | R1 | S1 |
| FS-VERIFY-ENC | 顶层 encrypt，解密后 type=url_verification | 按配置密钥解密、比较内层 token | P0 → P1 | R1 | S1 |
| FS-EVENT-V1 | type=event_callback；event.type | A1 或 A2，按配置 | P2；加密时外包 P0 | R2 | S2 |
| FS-EVENT-V2 | schema=2.0；header.event_type | A1 或 A2，按配置 | P3；加密时外包 P0 | R2 | S2 |
| FS-CARD-V2 | header.event_type=card.action.trigger | 新版回调 A1/A2 | P3 + P4；可外包 P0 | R3 | S3、S4 |
| FS-PREVIEW | header.event_type=url.preview.get | 新版回调 A1/A2 | P3 + P5；可外包 P0 | R4 | S3、S6 |
| FS-CARD-V1 | 后台类型 card.action.trigger_v1；Body 为旧结构 | **A3**，不是 A2 | P6 | R5 | S7、S8 |

## 4. 认证与加密契约

### A1：Verification Token

| 请求体 | Token 路径 | 校验 | 来源 |
|---|---|---|---|
| 地址验证 | token | CT_EQ(token, 配置的 Verification Token) | S1 |
| v1.0 事件 | token | 同上 | S2 |
| v2.0 事件/新版回调 | header.token | 同上 | S2、S3 |
| 已加密数据 | 解密后的对应路径 | 不能从 encrypt 外层直接读取 token | S1、S3 |

### A2：Encrypt Key 签名

| 项目 | 精确规则 | 来源 |
|---|---|---|
| 输入头 | X-Lark-Request-Timestamp、X-Lark-Request-Nonce | S3 |
| 签名头 | X-Lark-Signature | S3 |
| 计算 | `HEX(SHA256(UTF8(timestamp + nonce + encrypt_key) || B))` | S3 |
| 算法类别 | 普通 SHA256，**不是 HMAC**；字段间不加分隔符 | S3 |
| Body 范围 | 实际 HTTP Body；加密模式为 encrypt 外层原始 JSON | S3 |
| 时间容忍 | 所列来源未规定统一容忍秒数 | S3 |
| 地址验证例外 | 安全校验章节明确排除请求网址校验；单独按 P1/R1 处理 | S1、S3 |

### P0：加密包装与解密

| 路径/步骤 | 类型/精确规则 | 来源 |
|---|---|---|
| encrypt | string；标准 Base64 文本 | S1、S3 |
| 密钥派生 | `K = SHA256(UTF8(encrypt_key))`，取 32 字节摘要，不是摘要的 Hex 文本 | S1、S3 |
| 数据解码 | `buf = B64DEC(encrypt)` | S1、S3 |
| IV | buf 前 16 字节 | S1、S3 |
| ciphertext | buf 剩余字节 | S1、S3 |
| 解密 | AES-256-CBC，移除 PKCS#7 填充 | S1、S3 |
| 内层 | UTF-8 JSON，按 P1/P2/P3 分流 | S1、S3 |
| 适用排除 | 旧版 card.action.trigger_v1 不采用此加密协议 | S3、S7 |

### A3：旧版卡片签名

| 项目 | 精确规则 | 来源 |
|---|---|---|
| 输入头 | X-Lark-Request-Timestamp、X-Lark-Request-Nonce | S7 |
| 签名头 | X-Lark-Signature | S7 |
| 计算 | `HEX(SHA1(UTF8(timestamp + nonce + verification_token) || B))` | S7 |
| 密钥值 | 应用预先配置的 Verification Token；**不是 Body.token** | S7、S8 |
| 算法类别 | 普通 SHA1，**不是 HMAC**；不使用 Encrypt Key | S7 |
| 重复点击标识 | 历史协议的 X-Refresh-Token 按成功交互刷新 | S7 |

### 平台可选性与安全边界

| 项目 | 平台描述 / 接收端要求 |
|---|---|
| 可选性 | S3 将来源安全校验列为可选步骤；Encrypt Key 是可选配置 |
| 接收端模式 | 安全实现应预先确定允许的 A1/A2/A3，不由不可信 Body 自选免签模式 |
| 旧卡片 token | 更新卡片的凭证，不是 Verification Token |
| 新卡片 event.token | 更新卡片的凭证，与 header.token 不同 |

## 5. 请求体契约

### P1：地址验证

| 字段 | 类型 | 约束（S1） |
|---|---|---|
| type | string | url_verification |
| challenge | string | 响应原样返回 |
| token | string | Verification Token |

```json
{ "type": "url_verification", "token": "example-token", "challenge": "example-challenge" }
```

### P2/P3：事件信封（S2）

官方概述提供结构和语义，未逐字段建立通用 Required 列；以下为 D，按具体事件文档增加约束。

| 语义 | v1.0 路径/类型 | v2.0 路径/类型 |
|---|---|---|
| 信封版本 | 无 schema | schema:string，2.0 |
| 外层种类 | type:string，event_callback | 由 header 与 schema 表示 |
| 唯一 ID | uuid:string | header.event_id:string |
| 来源 Token | token:string | header.token:string |
| 时间 | ts:string，秒及小数形式 | header.create_time:string；单位按具体事件文档 |
| 事件类型 | event.type:string | header.event_type:string |
| 应用上下文 | 按事件位于 event 内 | header.app_id / tenant_key:string |
| 业务对象 | event:object | event:object |

| 事件 | 业务字段路径投影 | 结构依据 |
|---|---|---|
| im.message.receive_v1 | event.sender、event.message.message_id/chat_id/message_type/content | S9 |
| 消息 content | string，内部为按 message_type 定义的 JSON 文本 | S9 |
| 其他事件 | 按 header.event_type 或 event.type 选择资源结构 | S2 及具体事件页 |
| 时间单位 | 消息事件示例与卡片事件可能不同；卡片回调明确微秒 | S4、S9，不能全局统一为毫秒 |

### P4：新版卡片业务对象（S4）

| 路径 | 类型 | 条件/语义 |
|---|---|---|
| schema | string | 2.0 |
| header.event_type | string | card.action.trigger |
| header.create_time | string | 微秒时间戳 |
| header.event_id / token / app_id / tenant_key | string | 按新版回调信封 |
| event.operator | object | 操作者上下文 |
| event.operator.open_id / union_id / tenant_key | string | 身份字段，按授权提供 |
| event.operator.user_id | string | C，获得 user ID 权限才返回 |
| event.token | string | 更新卡片凭证，30 分钟有效，最多更新 2 次 |
| event.action | object | 操作信息 |
| event.action.value | string或object | 自定义回传数据；不是只能为 object |
| event.action.tag / name | string | 组件类型/自定义名称 |
| event.action.form_value | object | C，表单容器提交 |
| event.action.input_value | string | C，表单外输入框 |
| event.action.option / options | string / string[] | C，表单外单选/多选 |
| event.action.checked | boolean | C，表单外勾选器 |
| event.action.timezone | string | C，日期/时间相关组件 |
| event.host | string | 展示场景 |
| event.delivery_type | string | C，链接预览卡片为 url_preview |
| event.context | object | 消息/链接预览上下文 |
| event.context.open_message_id / open_chat_id | string | 消息/会话 ID |
| event.context.url / preview_token | string | C，链接预览场景 |

### P5：链接预览业务对象（S6）

| 路径 | 类型 | 条件/语义 |
|---|---|---|
| header.event_type | string | url.preview.get |
| event.operator | object | 操作者；user_id 仍受权限控制 |
| event.host | string | im_message 或 im_top_notice |
| event.context.url | string | 待预览链接 |
| event.context.preview_token | string | C，消息发送后才生成；多次回调可能共享 |
| event.context.open_message_id / open_chat_id | string | 临时输入预览时可为空 |

### P6：旧版卡片（S8）

| 路径 | 类型 | 语义 |
|---|---|---|
| open_id / user_id | string | 操作者；user_id 受权限控制 |
| tenant_key | string | 租户 |
| open_message_id | string | 卡片消息 |
| token | string | 更新卡片凭证；**不是来源校验 Token** |
| action | object | value、tag、timezone、name、form_value、input_value、option、options 按组件提供 |
| schema/header | — | 不套用新版信封 |

## 6. 响应契约

| ID | 请求 | 状态/时限 | Body | 来源 |
|---|---|---|---|---|
| R1 | 明文/加密地址验证 | `200`；1 秒内 | 明文 JSON {"challenge":"原值"}；不包产品响应，不再次加密 | S1 |
| R2 | 普通事件 | `200`；整体 3 秒，TCP 建连 2 秒 | 未规定统一业务 JSON；不是 challenge | S2 |
| R3 | 新版卡片 | `200`；3 秒内；不接受 3xx | `{}`、toast、card 专用 JSON | S4、S5 |
| R4 | 预览 | 3 秒内返回预览数据；按回调成功响应 | inline / card 专用 JSON | S3、S6 |
| R5 | 旧版卡片 | `200`；3 秒内 | 旧卡片 JSON/模板，可带 toast；没有新版 card 外包装 | S8 |

### R3/R4：专用字段

| 路径 | 类型 | 条件/约束 | 来源 |
|---|---|---|---|
| toast | object | O；反馈提示 | S4 |
| toast.type | string | info/success/error/warning | S4 |
| toast.content / i18n | string / map | 单语言/多语言文本 | S4 |
| card | object | O；更新/展示卡片 | S4、S6 |
| card.type | string | C，提供 card 时；raw 或 template | S4 |
| card.data | object | C，提供 card 时；按卡片类型定义 | S4 |
| card.data.template_id | string | C，template 类型 | S4 |
| card.data.template_version_name / template_variable | string / map | O | S4 |
| inline | object | O，仅预览响应 | S6 |
| inline.title / i18n_title | string / map | 多语言标题优先于 title | S6 |
| inline.image_key / url | string / object | 图标及多端跳转配置 | S6 |

## 7. 投递语义

| 项目 | 规则 | 来源 |
|---|---|---|
| 普通事件失败重试 | 间隔 15 秒、5 分钟、1 小时、6 小时，最多重试 4 次 | S2 |
| 成功后重复 | 至少一次策略，成功接收仍可能重复 | S2 |
| 普通事件去重 | v1 uuid；v2 header.event_id；按应用/租户隔离 | S2；隔离为接收端策略 |
| 新版业务回调 | 同步操作，不提供普通事件的失败补推机制 | S3 |
| 延时更新卡片 | 先成功响应，再使用更新凭证调用 API；不是延迟 ACK | S5 |
| 新旧卡片同时订阅 | 可产生两种结构的两个请求；官方建议避免重复配置 | S5 |
| 全局顺序 | 不将普通事件一概视为严格有序 | 按具体事件定义 |

## 8. 官方来源

| 编号 | 来源 | 约束范围 |
|---|---|---|
| S1 | [事件 HTTP 订阅与地址验证](https://open.feishu.cn/document/event-subscription-guide/event-subscriptions/event-subscription-configure-/choose-a-subscription-mode/send-notifications-to-developers-server?lang=zh-CN) | 地址、加密、challenge |
| S2 | [事件概述](https://open.feishu.cn/document/server-docs/event-subscription-guide/overview?lang=zh-CN) | 信封、3 秒及重投 |
| S3 | [接收回调](https://open.feishu.cn/document/event-subscription-guide/callback-subscription/receive-and-handle-callbacks?lang=zh-CN) | 来源校验、解密、同步边界 |
| S4 | [新版卡片回传交互](https://open.feishu.cn/document/feishu-cards/card-callback-communication?lang=zh-CN) | 字段、Token、响应 |
| S5 | [处理卡片回调](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/handle-card-callbacks?lang=zh-CN) | ACK、延时更新、新旧并存 |
| S6 | [拉取链接预览数据](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/development-link-preview/pull-link-preview-data-callback-structure) | 预览请求与响应 |
| S7 | [旧版卡片安全校验](https://open.feishu.cn/document/common-capabilities/message-card/add-card-interaction/message-card-security-verification?lang=zh-CN) | Verification Token + SHA1 |
| S8 | [旧版卡片结构](https://open.feishu.cn/document/ukTMukTMukTM/uYzM3QjL2MzN04iNzcDN/configuring-card-callbacks/card-callback-structure) | 旧 Body 与响应 |
| S9 | [接收消息事件](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/events/receive) | 消息内容与字段 |
