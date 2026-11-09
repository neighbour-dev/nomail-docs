---
title: Slack 事件、命令与交互回调 HTTP 协议 | NoMail
description: 查阅 Slack Events API、URL 验证、Slash Command、按钮、弹窗和动态菜单的签名校验、表单编码、请求字段、响应格式与三秒确认规则。
---

# Slack Webhook 与交互回调协议

[平台索引](../webhook-platform-reference-2026-10-30.md) · [约束标记与算法符号](../webhook-contract-conventions.md)

## 1. 范围与版本

| 项目 | 定义 |
|---|---|
| 核对日期 | 2026-11-08 |
| 传输 | HTTP POST；Events、Interactivity、Options Load、Slash Commands 分别配置地址 |
| 排除 | Socket Mode、发送给 Slack 的 Incoming Webhook、旧 attachment/dialog 交互的完整规格 |
| 实现来源 | SSL 探测补充核对官方 Bolt JS，固定提交 6cf7b0c7adb63f67310d54f23c8a98565640925d |
| 字段适用范围 | 普通 HTTP 应用；Functions/Deno 专有字段单列，不合并为所有请求必填 |

## 2. 配置参数

| 参数 | 配置位置/约束 | 协议影响 | 来源 |
|---|---|---|---|
| Signing Secret | Basic Information → App Credentials | A1；不是 Bot/OAuth/Client Secret | S2 |
| Events Request URL | Event Subscriptions | SK-VERIFY / EVENT / LIMIT | S1、S3 |
| Interactivity Request URL | Interactivity & Shortcuts | 操作、快捷方式、弹窗请求 | S4 |
| Options Load URL | Interactivity & Shortcuts | SK-OPTIONS | S8 |
| Slash Command Request URL | 每个命令配置 | SK-COMMAND / SSL | S7 |
| OAuth scopes / 安装授权 | 决定事件可见范围 | 不代替入站请求签名 | S1 |
| TLS | 公开分发使用 HTTPS；按功能文档核对证书要求 | 传输层 | S3、S4、S7 |

## 3. 请求类型注册表

| ID | 外层编码 | 精确识别条件 | 认证 | Body | 响应 |
|---|---|---|---|---|---|
| SK-VERIFY | JSON | type=url_verification | A1 | P1 | R1 |
| SK-EVENT | JSON | type=event_callback | A1 | P2 | R2 |
| SK-LIMIT | JSON | type=app_rate_limited | A1 | P3 | R2 |
| SK-ACTION | payload 表单 | payload.type=block_actions | A1 | P4 | R3 |
| SK-SHORTCUT | payload 表单 | payload.type=shortcut | A1 | P5 | R3 |
| SK-MESSAGE-ACTION | payload 表单 | payload.type=message_action | A1 | P5 | R3 |
| SK-SUBMIT | payload 表单 | payload.type=view_submission | A1 | P6 | R4 |
| SK-CLOSE | payload 表单 | payload.type=view_closed | A1 | P6 | R3 |
| SK-OPTIONS | payload 表单 | payload.type=block_suggestion | A1 | P7 | R5 |
| SK-COMMAND | 直接字段表单 | command 字段 | A1 | P8 | R6 |
| SK-SSL | 直接字段表单 | ssl_check 的**字符串值严格等于 1** | A2，非业务探测 | P9 | R7 |

## 4. 认证契约

### A1：签名

| 项目 | 精确约束（S2） |
|---|---|
| K | UTF8(Signing Secret 原文)；不做 Base64/Hex 解码 |
| 时间头 | X-Slack-Request-Timestamp，Unix 秒原始文本 |
| 签名头 | X-Slack-Signature，格式 v0= 后接 64 位十六进制 |
| 签名消息 | `UTF8("v0:" + t + ":") || B` |
| 期望值 | `"v0=" + HEX(HMAC256(K, message))` |
| 比较 | 常量时间比较 |
| 新鲜度 | 官方校验流程检查与当前时间的绝对差不超过 300 秒 |
| 签名范围 | JSON、payload 表单、直接字段表单都使用**完整原始 HTTP B** |
| 旧 token | 已弃用；不是 A1 失败时的业务认证回退 |

### A2：SSL 探测例外

| 项目 | 精确约束 | 来源 |
|---|---|---|
| 目的 | 公开分发命令地址的 SSL 连通性检查 | S7 |
| 字段 | ssl_check=1、token（历史 Verification Token） | S7 |
| 签名 | 官方 Bolt JS 将该探测作为不要求签名的分支 | S9，官方实现而非所有 SDK 的统一承诺 |
| 允许动作 | 仅返回探测 ACK，不分发事件或命令 | S9 |
| 防混入 | S9 丢弃同一请求夹带的 payload 等内容，只保留 ssl_check=1 | S9 |
| 安全实现要求 | 不能把“存在 ssl_check 字段”作为任意业务请求的免签条件 | 由 S9 的精确判断与隔离行为导出 |

### 可选 TLS 客户端认证

| 项目 | S2 规定 |
|---|---|
| mTLS CA | DigiCert 根证书链；校验客户端证书链 |
| 身份 | SAN DNS=platform-tls-client.slack.com；CN 为兼容候选 |
| 代理转发 | 认证身份头必须由可信 TLS 终止层注入，并清洗客户端同名头 |

## 5. 请求体契约

### 编码

| 编码 | Content-Type | 处理顺序 |
|---|---|---|
| JSON | application/json | 验 B → 解析 JSON |
| payload 表单 | application/x-www-form-urlencoded | 验整个 B → 表单解码 → 解析 payload 的 JSON |
| 直接字段表单 | application/x-www-form-urlencoded | 验整个 B → 直接读取表单字段，不寻找 payload |

### P1：URL 验证（S3）

| 字段 | 类型 | 出现规则 | 约束 |
|---|---|---|---|
| type | string | R | url_verification |
| challenge | string | R | 随机值；响应原样返回 |
| token | string | D，已弃用字段 | 不取代业务签名 |

### P2：事件信封（S1）

| 字段 | 类型 | 规则/语义 |
|---|---|---|
| type | string | event_callback |
| team_id | string | 工作区上下文 |
| api_app_id | string | 目标应用 |
| event_id | string | 事件唯一标识，跨工作区全局唯一 |
| event_time | integer | 分发时间，Unix 秒 |
| event | object | 内层事件；按 event.type 及可能的 subtype 分发 |
| authorizations | object[] | 可见该事件的安装授权摘要；不能按一条授权复制一条事件 |
| event_context | string | 用于查询完整可见授权；并非所有事件都提供 |
| context_team_id / context_enterprise_id | string或null，按上下文 | 投递所经安装上下文 |
| is_ext_shared_channel | boolean | 共享频道上下文 |

以上为 S1 字段描述，不把字段表未声明的必填性统一升级为 R。

| 内层事件类别 | 字段路径投影 | 完整定义 |
|---|---|---|
| message | type、subtype、channel、ts；text/user/message 等按 subtype | [Message 事件](https://docs.slack.dev/reference/events/message/) |
| reaction_added / removed | user、reaction、item、item_user、event_ts | [事件目录](https://docs.slack.dev/reference/events/) |
| file / app / team 等 | 对应内层事件对象 | [事件目录](https://docs.slack.dev/reference/events/) |

### P3：限流通知（S1）

| 字段 | 类型 | 语义 |
|---|---|---|
| type | string | app_rate_limited |
| team_id / api_app_id | string | 被限制的工作区与应用 |
| minute_rate_limited | integer | 按分钟取整的 Unix 秒 |
| token | string | 已弃用字段 |
| event | — | 不使用 event_callback 信封 |

### P4：Block actions（S5）

下表作用于**解码后的 payload JSON**。

| 路径 | 类型 | 出现规则 | 语义 |
|---|---|---|---|
| type | string | R | block_actions |
| trigger_id | string | R | 打开弹窗的短效凭证 |
| user | object | R | 操作者 |
| team | object或null | R | org-installed 时为 null |
| container | object | R | message/view 等容器 |
| api_app_id | string | R | 应用 ID |
| actions | object[] | S5 标 O | 触发组件操作集合 |
| actions[].block_id / action_id | string | C，动作项内 | 组件定位 |
| actions[].type | string | 按组件 | button/static_select 等 |
| actions[].value | 依组件 | **不得全局假定存在**，见来源冲突表 | 自定义值或选择结果 |
| channel / message / view | object | O，按所属界面 | 上下文，不保证三者齐全 |
| state | object | O | 其他有状态组件的值 |
| response_url | string | O；Functions 中已弃用 | 临时响应能力，敏感值 |
| function_data / interactivity / bot_access_token | object / object / string | Functions 专有 | 不作为普通 HTTP 应用全局必填字段 |

### P5：快捷方式（S10）

| 字段 | 类型 | shortcut | message_action |
|---|---|---|---|
| type | string | shortcut | message_action，注意不是 message_actions |
| callback_id | string | 配置的入口 ID | 配置的入口 ID |
| user / team | object | 操作者/工作区 | 操作者/工作区 |
| trigger_id | string | 短效触发凭证 | 短效触发凭证 |
| message / channel | object | 不提供消息上下文 | 被选中的消息/所在频道 |
| response_url | string | 不提供 | 消息快捷方式提供 |

### P6：视图（S6）

| 路径 | 类型 | view_submission | view_closed |
|---|---|---|---|
| type | string | R，view_submission | D，view_closed |
| team | object或null | R，org-installed 可 null | D |
| user / view | object | R | D |
| api_app_id | string | R | 官方示例提供 |
| view.state.values | map | O；按 block_id → action_id → 组件值定位 | 不作为提交结果消费 |
| is_cleared | boolean | — | 是否整个视图栈被关闭 |
| response_urls | object[] | O；视图配置允许生成时 | — |
| function_data / interactivity / bot_access_token | 专用结构 | Functions 专有 | 不全局要求 |

### P7：菜单选项加载（S8、S11）

| 路径 | 类型 | 出现规则 | 约束 |
|---|---|---|---|
| type | string | S11 示例/类型定义 | block_suggestion |
| user / team | object | R | 上下文 |
| api_app_id | string | R | 应用 ID |
| block_id / action_id | string | R | 菜单组件定位 |
| value | string | R | 用户输入的查询文本 |
| channel / message / view | object | O | 依界面提供 |
| function_data / bot_access_token | object / string | Functions 专有 | 不合并为普通应用必填 |

### P8：Slash Command（S7）

| 直接表单字段 | 类型 | 约束/语义 |
|---|---|---|
| command | string | 包括斜杠，例如 /example |
| text | string | 命令后的原始输入，可为空 |
| user_id / channel_id / team_id | string | 操作者、频道和工作区 |
| enterprise_id / enterprise_name | string | C，Enterprise 场景 |
| api_app_id | string | 目标应用 ID |
| response_url | string | 临时回复地址，不是事件 ID |
| trigger_id | string | 弹窗触发凭证 |
| token | string | 已弃用，不作为 A1 的替代 |
| user_name 等 *_name | string | 显示信息，不作为稳定标识 |

### P9：SSL 探测

```text
ssl_check=1&token=example-legacy-token
```

## 6. 响应契约

| ID | 请求 | 成功状态/时限 | Content-Type / Body | 来源 |
|---|---|---|---|---|
| R1 | URL 验证 | `200`；立即响应 | text/plain 原 challenge；或表单 challenge=...；或 JSON {"challenge":"..."} | S3 |
| R2 | Events 通知 | `2xx`，3 秒内 | 无固定业务 Body；官方建议 `200` | S1 |
| R3 | actions/shortcut/close | `200`，3 秒内 | 可空；业务反馈另调 API/response_url | S4 |
| R4 | view_submission | `200`，3 秒内 | 空 Body 关闭当前视图；或 response_action 专用 JSON | S6、S12 |
| R5 | block_suggestion | `200`，交互确认时限 3 秒 | application/json，options 或 option_groups | S4、S8 |
| R6 | Slash Command | `200`，3000 ms 内 | 可空、纯文本、或消息 JSON | S7 |
| R7 | ssl_check | `200` | 空 Body；只结束探测，不进入业务 | S7、S9 |

### R4：视图业务响应

| response_action | 所需数据 | 结果 |
|---|---|---|
| 无；空 Body | — | 关闭当前提交视图 |
| errors | errors: map，键为 block_id，值为错误文本 | 保留表单并标记错误 |
| update | view: 新视图对象 | 更新当前视图 |
| push | view: 新视图对象 | 推入新视图；视图栈最多 3 层 |
| clear | 无额外视图 | 清空视图栈 |

### R5：选项响应

| 字段 | 类型 | 约束（S8） |
|---|---|---|
| options | option[] | 与 option_groups 二选一；最多 100 个 |
| option_groups | option_group[] | 最多 100 组，每组最多 100 个选项 |
| option.text | plain_text 对象 | 显示文本 |
| option.value | string | 选择值 |

```json
{ "options": [{ "text": { "type": "plain_text", "text": "Example" }, "value": "example" }] }
```

### R6：命令消息响应

| 字段 | 类型 | 约束（S7） |
|---|---|---|
| text / blocks | string / object[] | 按消息格式定义 |
| response_type | string | ephemeral（默认）或 in_channel |
| HTTP 状态与业务错误 | — | 输入校验错误可在 `200` 消息内告知；不等同通信失败 |

## 7. 投递与临时凭证

| 项目 | 精确规则 | 来源 |
|---|---|---|
| Events 自动重试 | 失败后最多 3 次：近乎立即、1 分钟、5 分钟 | S1 |
| Delayed Events | 启用后追加每小时重试，持续 24 小时；不能宣称所有应用默认如此 | S1 |
| 重试头 | X-Slack-Retry-Num、X-Slack-Retry-Reason；不作为事件 ID | S1 |
| 停止某事件重试 | 非成功响应中设置 x-slack-no-retry: 1 | S1 |
| Events 重定向 | 官方允许最多 2 次 301/302；不能套用 Stripe 的一概失败规则 | S1 |
| response_url | 按支持该字段的交互，30 分钟内最多 5 次回复 | S4 |
| trigger_id | 3 秒过期，只能使用一次 | S4 |
| view_closed | 创建视图时 notify_on_close=true 才通知 | S6 |

### 官方字段表与示例冲突

| 项目 | 官方字段表 | 同页示例/组件条件 | 本文处理 |
|---|---|---|---|
| block_actions.actions[].value | S5 标 Required | Home tab 按钮示例无 value；组件自身 value 可选 | 不建立所有动作一律有 value 的校验 |
| block_actions.hash | S5 标 Required | 示例中位于 view.hash 或不出现顶层 hash | 依容器/视图定义，不强加顶层字段 |
| view_submission.enterprise | S6 标 Required | 示例未提供，语义又依 Enterprise 安装 | 不把示例提升成统一 Required；保留上下文条件 |

## 8. 官方来源

| 编号 | 来源 | 约束范围 |
|---|---|---|
| S1 | [Events API](https://docs.slack.dev/apis/events-api/) | 信封、限流、确认、重试 |
| S2 | [Request verification](https://docs.slack.dev/authentication/verifying-requests-from-slack/) | HMAC、时效、mTLS |
| S3 | [HTTP Request URLs](https://docs.slack.dev/apis/events-api/using-http-request-urls/) | challenge |
| S4 | [Handling user interaction](https://docs.slack.dev/interactivity/handling-user-interaction/) | 表单、ACK、临时凭证 |
| S5 | [block_actions](https://docs.slack.dev/reference/interaction-payloads/block_actions-payload/) | 操作字段及示例 |
| S6 | [View payloads](https://docs.slack.dev/reference/interaction-payloads/view-interactions-payload/) | 提交/关闭字段 |
| S7 | [Slash commands](https://docs.slack.dev/interactivity/implementing-slash-commands/) | 命令与 SSL 探测 |
| S8 | [External select](https://docs.slack.dev/reference/block-kit/block-elements/select-menu-element/#external_select) | 选项响应限制 |
| S9 | [Bolt JS HTTP receiver，固定提交](https://github.com/slackapi/bolt-js/blob/6cf7b0c7adb63f67310d54f23c8a98565640925d/src/receivers/HTTPModuleFunctions.ts) | SSL 探测的官方实现边界 |
| S10 | [Shortcuts payloads](https://docs.slack.dev/reference/interaction-payloads/shortcuts-interaction-payload/) | shortcut/message_action |
| S11 | [block_suggestion](https://docs.slack.dev/reference/interaction-payloads/block_suggestion-payload/) | 菜单查询字段 |
| S12 | [Modals](https://docs.slack.dev/surfaces/modals/) | response_action 与视图栈 |
