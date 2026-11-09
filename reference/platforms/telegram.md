---
title: Telegram Bot Webhook and Update request/response protocol | NoMail
description: Reference setWebhook, Secret Tokens, Update variants, messages and queries, distinguishing HTTP ACKs from callback, inline, shipping, and checkout business responses.
---

# Telegram Bot API Webhook protocol

[Platform index](../webhook-platform-reference-2026-10-30.md) · [Constraint markers and algorithms](../webhook-contract-conventions.md)

## 1. Scope and versions

| Item | Definition |
|---|---|
| Checked | 2026-11-08 |
| Inbound | Telegram → receiver: HTTPS POST + JSON Update |
| Envelope | One Update object per request; not an array or ok/result wrapper |
| Outbound | Receiver → Bot API: Bot Token in URL, distinct from inbound Secret Token |
| Versions | Update fields per S2 on checked date; additions do not change existing envelope |
| Cloud/local | Local Bot API Server has different URL/port/HTTP capabilities, listed separately |

## 2. setWebhook configuration contract

| Parameter | Type | Presence | Constraint | Source |
|---|---|---|---|---|
| url | string | R | Cloud HTTPS; empty string deletes Webhook | S1 |
| secret_token | string | O | 1–256 characters: A–Z, a–z, 0–9, underscore, hyphen only | S1 |
| allowed_updates | string[] | O | Omission keeps previous setting; empty array defaults to excluding chat_member, message_reaction, message_reaction_count | S1 |
| max_connections | integer | O | Cloud 1–100, default 40 | S1 |
| ip_address | string | O | Fixed destination IP instead of DNS resolution | S1 |
| certificate | InputFile | O/C | Upload public certificate for self-signed TLS, not private key or plain string | S1 |
| drop_pending_updates | boolean | O | true discards queued updates | S1 |

| Transport constraint | Cloud | Local Server | Source |
|---|---|---|---|
| HTTP | Not supported; even port 80 requires HTTPS | HTTP allowed | S1, S3 |
| Ports | 443, 80, 88, 8443 | Any port | S1, S3 |
| Address | Public receiver | Local IP allowed | S3 |
| Receipt mode | Webhook and getUpdates mutually exclusive | Same Bot receipt-mode configuration | S1 |

## 3. Request registry

| ID | Identification | Authentication | Body | HTTP response | Business answer |
|---|---|---|---|---|---|
| TG-NOTIFY | Message/state/notification Update field | A1 or unconfigured A0 | P1 + matching object | R1 | Feature-specific API calls |
| TG-CALLBACK | callback_query | Same | P3 | R1 | R2 answerCallbackQuery |
| TG-INLINE | inline_query | Same | P4 | R1 | R3 answerInlineQuery |
| TG-SHIPPING | shipping_query | Same | P5 | R1 | R4 answerShippingQuery |
| TG-PRECHECKOUT | pre_checkout_query | Same | P6 | R1 | R5 answerPreCheckoutQuery, 10 seconds |
| TG-RETRY | Original Update resent | Same | Same update_id | R1 | Do not execute business action twice |

## 4. Authentication contract

| ID | Condition | Inbound credential | Verification | Source |
|---|---|---|---|---|
| A0 | No secret_token | No standard Secret Token header | No such application-layer authentication | S1 |
| A1 | secret_token configured | X-Telegram-Bot-Api-Secret-Token | Constant-time comparison with stored value | S1; comparison is security requirement |

| Item | Exact boundary |
|---|---|
| Body signature | No generic inbound Update HMAC in Bot API; A1 does not bind the body |
| Timestamp signature | No generic per-request signed timestamp |
| TLS | Transport protection; User-Agent cannot replace Secret Token |
| Bot Token | Outbound API credential; not required in inbound body/headers |
| Passport/business encryption | Some business data has its own encryption; not a universal Update wrapper |

## 5. Body contracts

### P1: Update envelope (S2)

| Path | Type | Presence | Constraint |
|---|---|---|---|
| update_id | integer | R | Update ID, scoped to Bot |
| Update fields below | Corresponding objects | O, mutually exclusive | **At most one** optional update field per Update |

### Update field registry

All optional S2 update fields as of the checked date. Links identify official types; do not use Message for every field.

| Top-level field | Object type | Meaning/condition |
|---|---|---|
| message | [Message](https://core.telegram.org/bots/api/types/message.md) | New message, not limited to text |
| edited_message | Message | Revision of known message |
| channel_post | Message | New channel message |
| edited_channel_post | Message | Revised channel message |
| business_connection | [BusinessConnection](https://core.telegram.org/bots/api/types/businessconnection.md) | Business account connection change |
| business_message | Message | Business account message |
| edited_business_message | Message | Revised business message |
| deleted_business_messages | [BusinessMessagesDeleted](https://core.telegram.org/bots/api/types/businessmessagesdeleted.md) | message_ids[], not deleted contents |
| guest_message | Message | Guest message; guest_query_id may enable specialized replies |
| message_reaction | [MessageReactionUpdated](https://core.telegram.org/bots/api/types/messagereactionupdated.md) | Admin plus explicit subscription; excludes Bot-set reactions |
| message_reaction_count | [MessageReactionCountUpdated](https://core.telegram.org/bots/api/types/messagereactioncountupdated.md) | Admin plus explicit subscription; aggregation may delay minutes |
| inline_query | [InlineQuery](https://core.telegram.org/bots/api/types/inlinequery.md) | Inline search request |
| chosen_inline_result | [ChosenInlineResult](https://core.telegram.org/bots/api/types/choseninlineresult.md) | Selected result; feedback collection required |
| callback_query | [CallbackQuery](https://core.telegram.org/bots/api/types/callbackquery.md) | Button/game callback |
| shipping_query | [ShippingQuery](https://core.telegram.org/bots/api/types/shippingquery.md) | Flexible shipping quote request |
| pre_checkout_query | [PreCheckoutQuery](https://core.telegram.org/bots/api/types/precheckoutquery.md) | Pre-checkout confirmation |
| purchased_paid_media | [PaidMediaPurchased](https://core.telegram.org/bots/api/types/paidmediapurchased.md) | Paid media purchase notification |
| poll | [Poll](https://core.telegram.org/bots/api/types/poll.md) | Poll state, subject to type-specific delivery conditions |
| poll_answer | [PollAnswer](https://core.telegram.org/bots/api/types/pollanswer.md) | Non-anonymous poll answer change |
| my_chat_member | [ChatMemberUpdated](https://core.telegram.org/bots/api/types/chatmemberupdated.md) | Bot's own membership; blocked/unblocked in private chats |
| chat_member | ChatMemberUpdated | Admin plus explicit allowed_updates |
| chat_join_request | [ChatJoinRequest](https://core.telegram.org/bots/api/types/chatjoinrequest.md) | Requires can_invite_users |
| chat_boost | [ChatBoostUpdated](https://core.telegram.org/bots/api/types/chatboostupdated.md) | Admin receives Boost updates |
| removed_chat_boost | [ChatBoostRemoved](https://core.telegram.org/bots/api/types/chatboostremoved.md) | Boost removed |
| managed_bot | [ManagedBotUpdated](https://core.telegram.org/bots/api/types/managedbotupdated.md) | Managed Bot creation/token/owner change |
| subscription | [BotSubscriptionUpdated](https://core.telegram.org/bots/api/types/botsubscriptionupdated.md) | User payment subscription change |
| stopped_message_generation | [MessageGenerationStopped](https://core.telegram.org/bots/api/types/messagegenerationstopped.md) | User stops message generation |

### P2: stable Message fields and content variants

A receiver projection, not a replacement for S4's full field table.

| Path | Type | Presence | Condition/meaning |
|---|---|---|---|
| message_id | integer | R | Chat-scoped message ID, not Bot-wide event ID |
| date | integer | R | Unix seconds |
| chat | Chat | R | Conversation |
| from | User | O | May be absent, e.g. channel messages |
| sender_chat | Chat | O | Sent on behalf of a chat |
| text / entities | string / MessageEntity[] | O | Text and entities |
| photo / document / sticker / video / audio / voice, etc. | Media-specific objects | O | File references, not binary HTTP bodies |
| caption / caption_entities | string / MessageEntity[] | O | Media caption/entities |
| Service message fields | Corresponding types | O | Membership, topics, payments, etc.; text not required |

### P3–P6: objects requiring business answers

| Object | Fields | Type/presence | Condition/meaning |
|---|---|---|---|
| CallbackQuery | id / from / chat_instance | string / User / string, R | Query ID, user, chat instance |
| CallbackQuery | message | MaybeInaccessibleMessage, O | Button on Bot's own message |
| CallbackQuery | inline_message_id | string, O | Inline-mode message |
| CallbackQuery | data / game_short_name | string, O, exactly one of the two | Button data or game name |
| InlineQuery | id / from / query / offset | string / User / string / string, R | query may be empty |
| InlineQuery | chat_type / location | string / Location, O | Context-dependent |
| ShippingQuery | id / from / invoice_payload / shipping_address | string / User / string / ShippingAddress, R | Shipping context |
| PreCheckoutQuery | id / from / currency / total_amount / invoice_payload | string / User / string / integer / string, R | Integer amount in smallest currency unit; currency may be XTR |
| PreCheckoutQuery | shipping_option_id / order_info | string / OrderInfo, O | Shipping option/order details |

Evidence: S5–S8 and official types. Even when present, CallbackQuery.message is not guaranteed fully accessible.

## 6. Response contracts

### R1: HTTP acknowledgement

| Item | Exact rule | Source |
|---|---|---|
| Success | `2XY`, i.e. `200–299` | S1 |
| Body | No fixed ACK JSON; may be empty; ok/result not required | S1, S3 |
| URL verification | No general challenge exchange | S1 configuration/receipt workflow |
| Deadline | S1 specifies no uniform HTTP seconds value for all Updates | S1 |
| Business answers | HTTP ACK does not replace R2–R5 | S5–S8 |

### R2–R5: outbound Bot API business answers

These are Bot Token-authorized API methods, not echoes of inbound query objects.

| ID / method | Required parameters | Conditional parameters | Limits/meaning | Source |
|---|---|---|---|---|
| R2 answerCallbackQuery | callback_query_id:string | text, show_alert, url, cache_time per method | Answer even without text to end button waiting state | S5 |
| R3 answerInlineQuery | inline_query_id:string, results:InlineQueryResult[] | cache_time, is_personal, next_offset, button | At most 50 results; next_offset at most 64 bytes | S7 |
| R4 answerShippingQuery | shipping_query_id:string, ok:boolean | shipping_options if true; error_message if false | Shipping quotes or refusal reason | S8 |
| R5 answerPreCheckoutQuery | pre_checkout_query_id:string, ok:boolean | error_message required if false | Decide **within 10 seconds** after query is sent | S6 |

### Include one Bot method call in the HTTP response

| Item | Exact rule (S3) |
|---|---|
| Content-Type | application/json, application/x-www-form-urlencoded, or multipart/form-data |
| method | Bot API method name |
| Other fields | Method parameters |
| Observability | Cannot retrieve success/result through this response; call API separately when a result is needed |

```json
{ "method": "answerCallbackQuery", "callback_query_id": "example-query", "text": "Received" }
```

## 7. Delivery semantics

| Item | Exact rule | Source |
|---|---|---|
| Retries | Retry non-`2XY`, give up after reasonable attempts; no fixed count/backoff table in S1 | S1 |
| Retention | Pending updates retained for at most 24 hours | S3 |
| update_id | Normally increasing; after at least a week without updates, next ID chosen randomly; not permanently contiguous | S2 |
| Deduplication scope | Bot identity + update_id; do not merge equal integers from different Bots | S2; composite scope is receiver policy |
| allowed_updates | Does not affect already-created updates; old types may arrive briefly | S1 |
| Exclusive modes | Cannot use getUpdates with Webhook configured | S1 |

## 8. Official sources

| ID | Source | Scope |
|---|---|---|
| S1 | [setWebhook](https://core.telegram.org/bots/api/methods/setwebhook.md) | Configuration, Secret Token, success, retries |
| S2 | [Update](https://core.telegram.org/bots/api/types/update.md) | Full envelope, exclusivity, IDs |
| S3 | [Bot API](https://core.telegram.org/bots/api) | Transport, retention, Local Server, response calls |
| S4 | [Message](https://core.telegram.org/bots/api/types/message.md) | Message fields |
| S5 | [CallbackQuery](https://core.telegram.org/bots/api/types/callbackquery.md) · [answerCallbackQuery](https://core.telegram.org/bots/api/methods/answercallbackquery.md) | Buttons/answers |
| S6 | [PreCheckoutQuery](https://core.telegram.org/bots/api/types/precheckoutquery.md) · [answerPreCheckoutQuery](https://core.telegram.org/bots/api/methods/answerprecheckoutquery.md) | Checkout, 10-second deadline |
| S7 | [InlineQuery](https://core.telegram.org/bots/api/types/inlinequery.md) · [answerInlineQuery](https://core.telegram.org/bots/api/methods/answerinlinequery.md) | Inline search/results |
| S8 | [ShippingQuery](https://core.telegram.org/bots/api/types/shippingquery.md) · [answerShippingQuery](https://core.telegram.org/bots/api/methods/answershippingquery.md) | Shipping queries |
