---
title: App Store Connect Webhook 签名与通知协议 | NoMail
description: 查阅 App Store Connect 的 HMAC 签名、完整订阅事件枚举、App 与构建状态、TestFlight 和后台资源通知结构，以及 Ping 的官方资料边界。
---

# App Store Connect Webhook 协议

[平台索引](../webhook-platform-reference-2026-10-30.md) · [约束标记与算法符号](../webhook-contract-conventions.md)

## 1. 范围与版本

| 项目 | 定义 |
|---|---|
| 核对日期 | 2026-11-08 |
| 协议 | App Store Connect API Webhook，Apple → 接收端 HTTP POST + JSON |
| 排除 | 内购/订阅的 App Store Server Notifications；不使用 signedPayload/JWS 验证规则 |
| 事件种类 | S5 核对日列出的 12 个 WebhookEventType，完整枚举见第 5 节 |
| 结构证据 | S2 为业务 Payload 示例；字段未提供统一 Required 声明时标 E，不擅自生成必填 Schema |

## 2. 配置契约

| 参数 | 类型 | 必填性/约束 | 来源 |
|---|---|---|---|
| name | string | R，创建时 | S4 |
| url | URI | R，接收地址 | S4 |
| secret | string | R，自定义难以猜测的文本 | S1、S4 |
| enabled | boolean | R，API 创建时 | S4 |
| eventTypes | WebhookEventType[] | R；后台至少选择一项 | S3、S4 |
| relationships.app | 应用关系 | 每个 Webhook 对应一个 App；创建后不能更换 | S1、S3 |
| 数量 | integer | 每个 App 最多 10 个 Webhook | S3 |
| 角色 | 账号角色 | Account Holder / Admin / App Manager | S3 |

### 请求方向与凭据

| 方向 | 请求用途 | 认证 | Body.type 所属层次 |
|---|---|---|---|
| Apple → 接收端 | 事件/Ping 投递 | A1，x-apple-signature | 业务通知类型 |
| 接收端 → Apple API | 创建/修改订阅 | App Store Connect JWT Bearer Token | webhooks 管理资源 |
| 接收端 → Apple API | 触发测试 | JWT Bearer Token | webhookPings 管理请求，不是入站 Ping Schema |
| 接收端 → Apple API | 补查反馈/构建/资源 | JWT Bearer Token | 被查询资源的 API 类型 |

## 3. 请求类型注册表

| ID | 识别/触发 | 认证 | Body | 响应 | 来源 |
|---|---|---|---|---|---|
| ASC-EVENT | data.type 对应事件表 | A1 | P1 + 对应事件变体 | R1 | S1、S2 |
| ASC-PING | 后台 Test 或 webhookPings API 触发；后台标为 Ping | A1，S1 描述每次 POST 签名 | P2，官方资料边界单列 | R1 | S1、S3、S6 |
| ASC-REDELIVERY | 对 Success/Failed 历史投递发起 Resend | A1 | 原业务事件；事件 ID 相同 | R1 | S3 |

## 4. 认证契约 A1

| 项目 | 精确约束 | 来源 |
|---|---|---|
| K | UTF8(配置的 Secret 原文) | S1 |
| 签名头 | x-apple-signature；HTTP 头名大小写不敏感 | S1 |
| 期望值 | `"hmacsha256=" + HEX(HMAC256(K, B))` | S1 |
| 前缀 | **hmacsha256=**，不是 sha256= | S1 |
| 覆盖范围 | 实际原始 HTTP Body 字节；不重新序列化 JSON | S1 |
| 比较 | 常量时间比较 | S1 引用的签名安全流程 |
| 时间戳 | 此签名公式无独立签名时间戳；attributes.timestamp 不在算法中单独处理 | S1 |
| Body 加密 | 所列资料未定义统一外层 AES/JWS 包装 | S1、S2 |
| 管理凭据 | 不用 App Store Connect 私钥/JWT 或内购共享密钥代替 Secret | S1 |

## 5. 请求体契约

### P1：业务通知信封

| 路径 | 类型 | 出现规则/约束 | 来源 |
|---|---|---|---|
| data | object | S2 业务示例均使用该包装 | S2 |
| data.type | string | 事件 Payload 类型，见下表；不等于大写订阅枚举 | S2 |
| data.id | string | 业务事件标识，不是被通知资源 ID | S2、S3 |
| data.version | integer | E，部分示例为 1；后台资源示例未给出，不能全局强制 | S2 |
| data.attributes | object | 对应事件专有属性 | S2 |
| data.relationships | object | 对应事件的关联资源 | S2 |
| relationships.instance.data | object | App/Build/反馈等示例的关联资源标识包装 | S2 |
| relationships.instance | object | **后台资源事件直接放 id/type/links，不包 data** | S2 明确说明 |
| relationships.marketplaceApp.data | object | 替代分发关联的市场 App | S2 |
| attributes.timestamp | 时间字符串 | E，按事件提供；不是所有类型都有 | S2 |

### 业务事件完整枚举

S5 的完整订阅枚举与 S2 Payload 映射；“字段”列按 S2 示例记为 E，不把例子未提供的字段认定为禁止字段。

| 订阅枚举（eventTypes） | 入站 data.type | attributes 字段/类型 | relationships |
|---|---|---|---|
| APP_STORE_VERSION_APP_VERSION_STATE_UPDATED | appStoreVersionAppVersionStateUpdated | newValue:string、oldValue:string、timestamp:时间字符串 | instance.data → appStoreVersions |
| BUILD_UPLOAD_STATE_UPDATED | buildUploadStateUpdated | newState:string；示例未带 timestamp/oldState | instance.data → buildUploads |
| BUILD_BETA_DETAIL_EXTERNAL_BUILD_STATE_UPDATED | buildBetaDetailExternalBuildStateUpdated | newExternalBuildState:string、oldExternalBuildState:string、timestamp:时间字符串 | instance.data → buildBetaDetails |
| BETA_FEEDBACK_SCREENSHOT_SUBMISSION_CREATED | betaFeedbackScreenshotSubmissionCreated | timestamp:时间字符串 | instance.data → betaFeedbackScreenshotSubmissions；可有 links |
| BETA_FEEDBACK_CRASH_SUBMISSION_CREATED | betaFeedbackCrashSubmissionCreated | timestamp:时间字符串 | instance.data → betaFeedbackCrashSubmissions；可有 links |
| BACKGROUND_ASSET_VERSION_STATE_UPDATED | backgroundAssetVersionStateUpdated | newState:string、oldState:string、timestamp:时间字符串 | instance 直接 id/type/links → backgroundAssetVersions |
| BACKGROUND_ASSET_VERSION_INTERNAL_BETA_RELEASE_CREATED | backgroundAssetVersionInternalBetaReleaseCreated | timestamp:时间字符串 | instance 直接 id/type/links → backgroundAssetVersionInternalBetaReleases |
| BACKGROUND_ASSET_VERSION_EXTERNAL_BETA_RELEASE_STATE_UPDATED | backgroundAssetVersionExternalBetaReleaseStateUpdated | newState:string、oldState:string、timestamp:时间字符串 | instance 直接 id/type/links → backgroundAssetVersionExternalBetaReleases |
| BACKGROUND_ASSET_VERSION_APP_STORE_RELEASE_STATE_UPDATED | backgroundAssetVersionAppStoreReleaseStateUpdated | newState:string、oldState:string、timestamp:时间字符串 | instance 直接 id/type/links → backgroundAssetVersionAppStoreReleases |
| ALTERNATIVE_DISTRIBUTION_PACKAGE_VERSION_CREATED | alternativeDistributionPackageVersionCreated | appId:string、timestamp:时间字符串 | instance.data → alternativeDistributionPackageVersions；marketplaceApp.data |
| ALTERNATIVE_DISTRIBUTION_PACKAGE_AVAILABLE_UPDATED | alternativeDistributionPackageAvailableUpdated | available:boolean、territories:string[]、appId:string、timestamp:时间字符串 | instance.data → alternativeDistributionPackages；marketplaceApp.data |
| ALTERNATIVE_DISTRIBUTION_TERRITORY_AVAILABILITY_UPDATED | alternativeDistributionTerritoryAvailabilityUpdated | available:boolean、territories:string[]、appId:string、timestamp:时间字符串 | 示例为 marketplaceApp.data，**不要求 instance** |

### 字段语义与资源读取

| 对象 | 精确处理规则 | 来源 |
|---|---|---|
| App 版本状态 | 状态取 newValue/oldValue，不用 newState 代替 | S2 |
| 构建上传 | 状态取 newState，不从 App 版本模型推导其他字段必填 | S2 |
| 外部 Beta 状态 | 使用 newExternalBuildState / oldExternalBuildState | S2 |
| 截图/崩溃反馈 | Payload 通知资源创建；完整截图/日志/反馈需 API 读取关联资源 | S2 |
| 后台资源 | import validation 失败可给 PROCESSING → FAILED；成功可创建 internal beta release | S2 |
| territories | Apple 事件给出的地区代码字符串数组，保持原值；不转为语言区域标签 | S2 |
| data.id 与 instance.id | 分别是事件与资源；不能互换用于事件去重 | S2 |

### P2：Ping 与管理资源的边界

| 官方已规定内容 | 明确结果 | 来源 |
|---|---|---|
| 后台 Test | 发送测试投递，Recent Deliveries 中显示 Ping | S3 |
| POST /v1/webhookPings | 可触发测试；请求体为管理 API 的 webhookPings 资源 | S1 |
| WebhookPing API 对象 | id:string（R）、type=webhookPings（R）、links:ResourceLinks（O） | S6 的 DocC 字段定义 |
| 入站 Ping 业务信封 | 所列 S1/S2/S3/S6 没有给出完整字段表或确定的业务 data.type | 不从 API 对象推导为 webhookPings，也不把第三方样例当官方契约 |
| 接入验证证据 | 后台 Request Payload / Response Payload 可查看实际投递 | S3 |

此处未建立入站 Ping 的完整 JSON Schema；这是一项明确的官方资料缺口，不是对任意结构的许可。

## 6. 响应契约 R1

| 项目 | 官方约束 | 接收端策略（非 Apple 承诺） |
|---|---|---|
| 成功状态集合 | S1/S3 未完整列出状态码集合 | 通知可靠接收后返回 `200` |
| 响应 Body | S1/S3 未规定统一业务 ACK JSON | 可使用空 Body |
| 响应时限 | S1/S3 未规定统一秒数 | 立即确认，耗时资源读取另行处理 |
| challenge | S1/S3 未定义 challenge 握手 | 不臆造 challenge 回显接口 |
| 决策性响应 | 业务状态变化是通知，不是要求接收端批准状态 | 不把 ACK 解释为批准审核/构建 |

## 7. 投递语义

| 项目 | 精确规则 | 来源 |
|---|---|---|
| 人工重投 | Success 或 Failed 均可 Resend；测试投递不可重投 | S3 |
| 重投标识 | 新建投递记录，事件 ID 保持相同 | S3 |
| 重投操作 | 某投递记录重投后不能再次重投该旧记录；可重投新记录 | S3 |
| 后台历史显示 | 最近一周最多 20 条近期投递 | S3 |
| 自动重试次数/退避 | 所列资料未规定 | S1、S3 |
| 全局顺序 | 所列资料未规定严格全局顺序 | S1、S2 |

## 8. 官方来源

| 编号 | 来源 | 约束范围 |
|---|---|---|
| S1 | [Configuring and parsing notifications](https://developer.apple.com/documentation/appstoreconnectapi/configuring-webhook-notifications) | 签名、管理 API、测试 |
| S2 | [Understanding webhook events](https://developer.apple.com/documentation/appstoreconnectapi/webhook-events) | 业务 Payload 与结构差异 |
| S3 | [Manage webhooks](https://developer.apple.com/help/app-store-connect/manage-your-team/manage-webhooks/) | 角色、数量、Test、Resend |
| S4 | [WebhookCreateRequest.Data.Attributes](https://developer.apple.com/documentation/appstoreconnectapi/webhookcreaterequest/data-data.dictionary/attributes-data.dictionary) · [官方 DocC 属性数据](https://developer.apple.com/tutorials/data/documentation/appstoreconnectapi/webhookcreaterequest/data-data.dictionary/attributes-data.dictionary.json) | 创建参数 Required 标记 |
| S5 | [WebhookEventType](https://developer.apple.com/documentation/appstoreconnectapi/webhookeventtype) · [官方 DocC 枚举数据](https://developer.apple.com/tutorials/data/documentation/appstoreconnectapi/webhookeventtype.json) | 完整 12 项订阅枚举 |
| S6 | [WebhookPing](https://developer.apple.com/documentation/appstoreconnectapi/webhookping) · [官方 DocC 字段数据](https://developer.apple.com/tutorials/data/documentation/appstoreconnectapi/webhookping.json) | 管理资源字段，非入站事件 Schema |
