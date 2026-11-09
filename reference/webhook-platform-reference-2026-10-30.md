---
title: Platform Webhook authentication, payload, and response index | NoMail
description: Compare Webhook encoding, authentication, deadlines, and specialized callbacks for GitHub, GitLab, Stripe, Slack, Feishu, Telegram, Shopify, Gitea, and App Store Connect.
---

# Platform Webhook protocol index

| Item | Scope |
|---|---|
| Purpose | Backend protocol implementation and App platform configuration/event presentation |
| Checked | 2026-11-08 |
| Product implementation status | Outside this section's scope |
| Includes | Platform-initiated HTTP notifications, URL verification, interaction callbacks, and test deliveries |
| Excludes | WebSockets, event bus wrappers, and Incoming Webhooks used to send messages to bots |
| Conventions | [Field requirements, evidence, and algorithm notation](webhook-contract-conventions.md) |

## Platform index

| Platform | Request identification | Body encoding | Authentication | Specialized responses |
|---|---|---|---|---|
| [GitHub](platforms/github.md) | X-GitHub-Event, Body.action | JSON / payload form | Secret + HMAC-SHA256; legacy SHA1 | Ping ACK only; no challenge echo |
| [GitLab](platforms/gitlab.md) | X-Gitlab-Event, body event fields | JSON / custom JSON template | Standard Webhooks HMAC / static Secret Token | Test uses selected event structure |
| [Stripe](platforms/stripe.md) | Body.type, endpoint payload format | Snapshot / Thin JSON | Timestamped HMAC-SHA256 | Synchronous Issuing authorization decision |
| [Slack](platforms/slack.md) | Outer type, event.type, payload.type, command | JSON / payload form / direct form | Timestamped HMAC-SHA256; separate SSL probes | Challenge, menu options, views, command results |
| [Feishu](platforms/feishu.md) | type, schema/header, event.type | JSON / encrypted encrypt JSON | Token / Encrypt Key + SHA256; legacy card SHA1 | Challenge, cards, link previews |
| [Telegram](platforms/telegram.md) | Optional top-level Update fields | JSON Update | Static Secret Token | Business answers for callbacks, inline queries, payments, etc. |
| [Shopify](platforms/shopify.md) | X-Shopify-Topic, API Version | Resource JSON / compliance JSON | Client Secret + HMAC-SHA256 | Compliance obligations; invalid compliance signatures return `401` |
| [Gitea](platforms/gitea.md) | X-Gitea-Event, X-Gitea-Event-Type | JSON / payload form; separate GET | Secret + HMAC-SHA256; optional additional Authorization | Test is a synthetic push |
| [App Store Connect](platforms/app-store-connect.md) | data.type | data-wrapped JSON | Secret + HMAC-SHA256 | Notification ACK; separate Ping documentation limits |

## Encoding and signature scope

| Encoding | Platforms | Signature input | Parsing after authentication |
|---|---|---|---|
| Raw JSON | GitHub, GitLab, Stripe, Slack, Shopify, Apple, Gitea | B in each platform's formula | JSON → envelope/resource |
| payload form | GitHub, Slack | **Entire encoded form B** | Form decode → payload string → JSON |
| payload form | Gitea v1.25.5 | **Original JSON text bytes after URL-decoding payload** | Verify specified text; never reserialize |
| Direct-field form | Slack Slash Commands | **Entire encoded form B** | Form fields; do not look for payload |
| encrypt JSON | Feishu encrypted events/new callbacks | **Encrypted outer B** | Parse encrypt → Base64 → AES-CBC → inner JSON |
| Bodyless GET | Gitea v1.25.5 | Original JSON text after decoding query parameter payload | Do not sign an empty body |

## Response deadlines

| Platform/request | Success | Deadline | Body | Evidence |
|---|---|---|---|---|
| GitHub notification/Ping | `2xx` | 10 seconds | No fixed business body | GitHub S3 |
| GitLab.com | `2xx`; `200` / `201` recommended | 10 seconds | No fixed business body | GitLab S1, S3 |
| GitLab Self-Managed | Same | Instance-configurable | Same | GitLab S4 |
| Stripe ordinary notification | `2xx` | Respond quickly; no uniform seconds value in listed general docs | No fixed business body | Stripe S1 |
| Stripe Issuing authorization | `200` | 2 seconds | approved decision and Stripe-Version response header | Stripe S4 |
| Slack Events | `2xx` | 3 seconds | URL verification also requires challenge | Slack S1, S3 |
| Slack interactions/commands | `200` | 3 seconds | Callback-specific | Slack S4–S8 |
| Feishu URL verification | `200` | 1 second | Plaintext challenge JSON | Feishu S1 |
| Feishu ordinary events | `200` | 3 seconds | No uniform business body | Feishu S2 |
| Feishu cards | `200` | 3 seconds | Specialized JSON | Feishu S4, S5 |
| Feishu link previews | Listed schema docs do not separately specify success statuses | 3 seconds | Specialized inline / card JSON | Feishu S3, S6 |
| Telegram Update | `2xx` | No uniform seconds value in setWebhook docs | May be empty; may invoke a Bot method | Telegram S1, S3 |
| Telegram checkout decision | HTTP ACK separate from business decision | 10 seconds for decision | answerPreCheckoutQuery | Telegram S6 |
| Shopify HTTPS | `2xx` | 1 second to connect; 5 seconds total | No uniform business body | Shopify S2 |
| Gitea v1.25.5 | `2xx` | DELIVER_TIMEOUT, default 5 seconds, configurable | No fixed business body | Gitea S2, S5 |
| App Store Connect | Listed docs do not fully specify success status set | No uniform seconds value in listed docs | No uniform ACK body specified | Apple S1, S3 |
