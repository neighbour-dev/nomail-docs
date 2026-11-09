---
title: Feishu event subscriptions, encryption, and card callback protocol | NoMail
description: Reference tokens, signatures, AES-CBC encryption, payloads, synchronous responses, and retries for URL verification, v1/v2 events, legacy/new cards, and link previews.
---

# Feishu Webhook event and callback protocol

[Platform index](../webhook-platform-reference-2026-10-30.md) · [Constraint markers and algorithms](../webhook-contract-conventions.md)

## 1. Scope and versions

| Item | Definition |
|---|---|
| Checked | 2026-11-08 |
| Transport | HTTP POST + JSON; event and callback URLs configured separately |
| Includes | URL verification, v1/v2 events, new cards, legacy cards, link previews |
| Excludes | Persistent connections, Webhooks for sending messages to custom group bots |
| Version distinction | Envelope schema=2.0, event name im.message.receive_v1, and card JSON version are different version dimensions |

## 2. Configuration parameters

| Parameter | Platform constraint | Purpose | Source |
|---|---|---|---|
| Request URL | Public HTTP/HTTPS IPv4; one event URL and one callback URL per app | POST destination | S1, S3 |
| Verification Token | Generated in app console | Plaintext token verification; legacy card signing value | S1, S3, S7 |
| Encrypt Key | O; enables encrypt wrapper for ordinary events/new callbacks | AES key derivation, A2 signature | S1, S3 |
| Event/callback subscriptions | Select, authorize, and publish separately | Event/interaction scope | S1, S2, S3 |
| App Secret | Management/API credential | **Not** Verification Token or Encrypt Key | S1, S3 |

## 3. Request registry

| ID | Identification (after decryption if needed) | Source verification | Body | Response | Source |
|---|---|---|---|---|---|
| FS-VERIFY-PLAIN | Top-level type=url_verification | Compare token; ordinary event signature header requirements do not apply | P1 | R1 | S1 |
| FS-VERIFY-ENC | Top-level encrypt, decrypted type=url_verification | Decrypt with configured key, compare inner token | P0 → P1 | R1 | S1 |
| FS-EVENT-V1 | type=event_callback; event.type | A1 or A2 by configuration | P2; P0 wrapper if encrypted | R2 | S2 |
| FS-EVENT-V2 | schema=2.0; header.event_type | A1 or A2 by configuration | P3; P0 wrapper if encrypted | R2 | S2 |
| FS-CARD-V2 | header.event_type=card.action.trigger | New callback A1/A2 | P3 + P4; possible P0 wrapper | R3 | S3, S4 |
| FS-PREVIEW | header.event_type=url.preview.get | New callback A1/A2 | P3 + P5; possible P0 wrapper | R4 | S3, S6 |
| FS-CARD-V1 | Console type card.action.trigger_v1; legacy body | **A3**, not A2 | P6 | R5 | S7, S8 |

## 4. Authentication and encryption contracts

### A1: Verification Token

| Body | Token path | Verification | Source |
|---|---|---|---|
| URL verification | token | CT_EQ(token, configured Verification Token) | S1 |
| v1.0 event | token | Same | S2 |
| v2.0 event/new callback | header.token | Same | S2, S3 |
| Encrypted data | Corresponding decrypted path | Cannot read token directly from encrypt wrapper | S1, S3 |

### A2: Encrypt Key signature

| Item | Exact rule | Source |
|---|---|---|
| Input headers | X-Lark-Request-Timestamp, X-Lark-Request-Nonce | S3 |
| Signature header | X-Lark-Signature | S3 |
| Calculation | `HEX(SHA256(UTF8(timestamp + nonce + encrypt_key) || B))` | S3 |
| Algorithm | Plain SHA256, **not HMAC**; no separators between fields | S3 |
| Body scope | Actual HTTP body; encrypted mode signs raw outer encrypt JSON | S3 |
| Tolerance | No uniform seconds value in listed sources | S3 |
| URL verification exception | Security section explicitly excludes request URL verification; use P1/R1 | S1, S3 |

### P0: encrypted wrapper and decryption

| Path/step | Type/exact rule | Source |
|---|---|---|
| encrypt | string; standard Base64 | S1, S3 |
| Key derivation | `K = SHA256(UTF8(encrypt_key))`, 32 digest bytes, not hex text | S1, S3 |
| Decode | `buf = B64DEC(encrypt)` | S1, S3 |
| IV | First 16 bytes of buf | S1, S3 |
| ciphertext | Remaining buf bytes | S1, S3 |
| Decrypt | AES-256-CBC, remove PKCS#7 padding | S1, S3 |
| Inner content | UTF-8 JSON; dispatch by P1/P2/P3 | S1, S3 |
| Exclusion | Legacy card.action.trigger_v1 does not use this encryption protocol | S3, S7 |

### A3: legacy card signature

| Item | Exact rule | Source |
|---|---|---|
| Input headers | X-Lark-Request-Timestamp, X-Lark-Request-Nonce | S7 |
| Signature header | X-Lark-Signature | S7 |
| Calculation | `HEX(SHA1(UTF8(timestamp + nonce + verification_token) || B))` | S7 |
| Secret | Preconfigured app Verification Token, **not Body.token** | S7, S8 |
| Algorithm | Plain SHA1, **not HMAC**; no Encrypt Key | S7 |
| Repeated-click marker | Legacy X-Refresh-Token refreshed on successful interaction | S7 |

### Optionality and security boundaries

| Item | Platform description / receiver requirement |
|---|---|
| Optionality | S3 lists source verification as optional; Encrypt Key is optional configuration |
| Receiver mode | Predetermine permitted A1/A2/A3; untrusted bodies must not select unsigned mode |
| Legacy card token | Card update credential, not Verification Token |
| New card event.token | Card update credential, distinct from header.token |

## 5. Body contracts

### P1: URL verification

| Field | Type | Constraint (S1) |
|---|---|---|
| type | string | url_verification |
| challenge | string | Echo unchanged |
| token | string | Verification Token |

```json
{ "type": "url_verification", "token": "example-token", "challenge": "example-challenge" }
```

### P2/P3: event envelopes (S2)

The overview provides structure/semantics, not a universal per-field Required column. These fields are D; add constraints from specific event documentation.

| Meaning | v1.0 path/type | v2.0 path/type |
|---|---|---|
| Envelope version | No schema | schema:string, 2.0 |
| Outer kind | type:string, event_callback | Represented by header and schema |
| Unique ID | uuid:string | header.event_id:string |
| Source token | token:string | header.token:string |
| Time | ts:string, seconds with fractions | header.create_time:string; unit per event documentation |
| Event type | event.type:string | header.event_type:string |
| App context | Within event, event-dependent | header.app_id / tenant_key:string |
| Business object | event:object | event:object |

| Event | Business field-path projection | Evidence |
|---|---|---|
| im.message.receive_v1 | event.sender, event.message.message_id/chat_id/message_type/content | S9 |
| Message content | string containing JSON text defined by message_type | S9 |
| Other events | Select resource by header.event_type or event.type | S2 and specific event pages |
| Time units | Message examples and card callbacks may differ; cards explicitly use microseconds | S4, S9; do not assume milliseconds globally |

### P4: new card business object (S4)

| Path | Type | Condition/meaning |
|---|---|---|
| schema | string | 2.0 |
| header.event_type | string | card.action.trigger |
| header.create_time | string | Microsecond timestamp |
| header.event_id / token / app_id / tenant_key | string | New callback envelope |
| event.operator | object | Actor context |
| event.operator.open_id / union_id / tenant_key | string | Identity fields, permission-dependent |
| event.operator.user_id | string | C, only with user ID permission |
| event.token | string | Card update credential; valid 30 minutes, at most 2 updates |
| event.action | object | Action information |
| event.action.value | string or object | Custom callback data; not object-only |
| event.action.tag / name | string | Component type/custom name |
| event.action.form_value | object | C, form container submission |
| event.action.input_value | string | C, input outside form |
| event.action.option / options | string / string[] | C, single/multiple selection outside form |
| event.action.checked | boolean | C, checkbox outside form |
| event.action.timezone | string | C, date/time-related component |
| event.host | string | Display context |
| event.delivery_type | string | C, url_preview for link preview cards |
| event.context | object | Message/link preview context |
| event.context.open_message_id / open_chat_id | string | Message/chat ID |
| event.context.url / preview_token | string | C, link preview |

### P5: link preview business object (S6)

| Path | Type | Condition/meaning |
|---|---|---|
| header.event_type | string | url.preview.get |
| event.operator | object | Actor; user_id remains permission-controlled |
| event.host | string | im_message or im_top_notice |
| event.context.url | string | Link to preview |
| event.context.preview_token | string | C, generated only after message sent; may be shared across callbacks |
| event.context.open_message_id / open_chat_id | string | May be empty for temporary input previews |

### P6: legacy cards (S8)

| Path | Type | Meaning |
|---|---|---|
| open_id / user_id | string | Actor; user_id permission-controlled |
| tenant_key | string | Tenant |
| open_message_id | string | Card message |
| token | string | Card update credential; **not source verification token** |
| action | object | value, tag, timezone, name, form_value, input_value, option, options by component |
| schema/header | — | Do not apply new envelope |

## 6. Response contracts

| ID | Request | Status/deadline | Body | Source |
|---|---|---|---|---|
| R1 | Plain/encrypted URL verification | `200`; within 1 second | Plain JSON {"challenge":"original"}; no product response wrapper or re-encryption | S1 |
| R2 | Ordinary event | `200`; 3 seconds total, 2 seconds TCP connect | No uniform business JSON; not challenge | S2 |
| R3 | New card | `200`; within 3 seconds; 3xx not accepted | `{}`, toast, card JSON | S4, S5 |
| R4 | Preview | Preview data within 3 seconds; callback success response | inline / card JSON | S3, S6 |
| R5 | Legacy card | `200`; within 3 seconds | Legacy card JSON/template, optional toast; no new card wrapper | S8 |

### R3/R4: specialized fields

| Path | Type | Condition/constraint | Source |
|---|---|---|---|
| toast | object | O, feedback | S4 |
| toast.type | string | info/success/error/warning | S4 |
| toast.content / i18n | string / map | Single/multilingual text | S4 |
| card | object | O, update/display card | S4, S6 |
| card.type | string | C if card supplied; raw or template | S4 |
| card.data | object | C if card supplied; per card type | S4 |
| card.data.template_id | string | C, template type | S4 |
| card.data.template_version_name / template_variable | string / map | O | S4 |
| inline | object | O, preview responses only | S6 |
| inline.title / i18n_title | string / map | Multilingual title takes precedence | S6 |
| inline.image_key / url | string / object | Icon and cross-client navigation configuration | S6 |

## 7. Delivery semantics

| Item | Rule | Source |
|---|---|---|
| Ordinary event retries | Intervals 15 seconds, 5 minutes, 1 hour, 6 hours; at most 4 retries | S2 |
| Duplicates after success | At-least-once; duplicates possible even after successful receipt | S2 |
| Event deduplication | v1 uuid; v2 header.event_id; isolate by app/tenant | S2; isolation is receiver policy |
| New business callbacks | Synchronous; no ordinary-event failure redelivery mechanism | S3 |
| Delayed card update | ACK successfully first, then call API with update credential; not delayed ACK | S5 |
| Both card generations subscribed | Two requests with different structures may result; avoid duplicate configuration | S5 |
| Global ordering | Do not assume all ordinary events are strictly ordered | Event-specific definitions |

## 8. Official sources

| ID | Source | Scope |
|---|---|---|
| S1 | [HTTP event subscriptions and URL verification](https://open.feishu.cn/document/event-subscription-guide/event-subscriptions/event-subscription-configure-/choose-a-subscription-mode/send-notifications-to-developers-server?lang=zh-CN) | URLs, encryption, challenge |
| S2 | [Event overview](https://open.feishu.cn/document/server-docs/event-subscription-guide/overview?lang=zh-CN) | Envelopes, 3-second deadline, retries |
| S3 | [Receive callbacks](https://open.feishu.cn/document/event-subscription-guide/callback-subscription/receive-and-handle-callbacks?lang=zh-CN) | Source verification, decryption, synchronous boundary |
| S4 | [New card interactions](https://open.feishu.cn/document/feishu-cards/card-callback-communication?lang=zh-CN) | Fields, tokens, responses |
| S5 | [Handle card callbacks](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/handle-card-callbacks?lang=zh-CN) | ACK, delayed update, coexistence |
| S6 | [Fetch link preview data](https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/development-link-preview/pull-link-preview-data-callback-structure) | Preview request/response |
| S7 | [Legacy card security verification](https://open.feishu.cn/document/common-capabilities/message-card/add-card-interaction/message-card-security-verification?lang=zh-CN) | Verification Token + SHA1 |
| S8 | [Legacy card structure](https://open.feishu.cn/document/ukTMukTMukTM/uYzM3QjL2MzN04iNzcDN/configuring-card-callbacks/card-callback-structure) | Legacy body/response |
| S9 | [Receive message events](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/events/receive) | Message content/fields |
