---
title: Stripe Webhook signatures, events, and authorization responses | NoMail
description: Distinguish Snapshot events, Thin notifications, and Issuing real-time authorizations; reference timestamped signatures, synchronous decisions, retries, rotation, and deduplication.
---

# Stripe Webhook protocol

[Platform index](../webhook-platform-reference-2026-10-30.md) · [Constraint markers and algorithms](../webhook-contract-conventions.md)

## 1. Scope and versions

| Item | Definition |
|---|---|
| Checked | 2026-11-08 |
| Transport | HTTP POST + JSON; registered public endpoints use HTTPS with TLS 1.2/1.3 (S1) |
| Payload modes | Snapshot Event / Thin EventNotification; destinations configured separately |
| Versions | Snapshot serializes against an API version; Thin notifications do not pin resource snapshots like Snapshot API versions (S2) |
| Outbound API | API Key required only to retrieve full Events/resources; not an inbound signing credential |

## 2. Configuration parameters

| Parameter | Constraint | Effect | Source |
|---|---|---|---|
| Endpoint URL | Public HTTPS; local CLI forwarding may use HTTP | Destination | S1 |
| Payload format | snapshot / thin | B1 / B2 | S1, S2 |
| Event types | Subscribe to the mode's catalog | Body.type values | S1, S2 |
| API version | Snapshot destination version | data.object resource schema | S2 |
| Signing Secret | Separate per endpoint/environment; usually whsec_ prefix | A1; **use raw text, do not strip/decode prefix** | S1 |
| Source scope | Own account, connected accounts, organization, etc. | account/context metadata | S1 |
| CLI Signing Secret | Output from stripe listen | CLI forwarding only; not interchangeable with registered endpoint secrets | S1 |

## 3. Request registry

| ID | Identification | Authentication | Body | Response | Source |
|---|---|---|---|---|---|
| ST-SNAPSHOT | Snapshot destination; object=event | A1 | B1 | R1 | S1, S2 |
| ST-THIN | Thin destination; S2 notification types | A1 | B2 | R1 | S1, S2 |
| ST-TEST | Sandbox/CLI-generated event, not a universal test type | A1 with environment's secret | B1/B2 | R1 | S1 |
| ST-RETRY | Same event delivered again | A1 with newly generated timestamp/signature | Original event | R1 | S1 |
| ST-ISSUING | Specialized real-time authorization; type=issuing_authorization.request | A1 with dedicated endpoint secret | B3 | **R2** | S4 |

## 4. Authentication contract A1

| Input | Format | Constraint |
|---|---|---|
| Signing Secret | UTF-8 text | Full original text including whsec_ as K |
| Stripe-Signature | Comma-separated key=value entries | t timestamp; v1 signatures, possibly multiple |
| t | Original Unix-seconds text | Preserve original text for signing |
| B | Raw HTTP body bytes | Never parse and reserialize JSON before verification |

```text
M = UTF8(t + ".") || B
expected = HEX(HMAC256(UTF8(signing_secret), M))
valid_signature = any(CT_EQ(expected, v1_candidate))
```

| Check | Exact rule | Source |
|---|---|---|
| Supported scheme | Verify v1 only; ignore fake v0 that may occur in test requests | S1 |
| Candidate encoding | 64 hex characters, without sha256= | S1 |
| Tolerance | Official SDK default 300 seconds, configurable; not a universal mandatory value | S1 |
| tolerance=0 | Disables freshness checking in official libraries; **not zero tolerance** | S1 |
| Retries | New t/signature each attempt; old signature strings are not event deduplication keys | S1 |
| Rotation | Old secret expiry may be delayed up to 24 hours; each active secret generates a signature | S1 |
| Authentication failure | Do not process; S1 example returns `400` | S1 example, not the only permitted error code |

## 5. Body contracts

### B1: Snapshot Event envelope

S3 Attributes defines types and nullability, but not Required markers for every serialization scenario. D/C below do not equate non-nullable with never omitted.

| Path | Type | Presence/value | Meaning |
|---|---|---|---|
| id | string | D | Event ID |
| object | string | D, fixed event | Object kind |
| type | string | D | Event type, e.g. invoice.paid |
| created | integer timestamp | D, Unix seconds | Event creation time, not a commit sequence |
| api_version | string or null | D; populated for events created on/after 2014-10-31 | data serialization version |
| data | object | D | Event data container |
| data.object | object | Event-specific | Resource snapshot at event time |
| data.previous_attributes | object | C, update events providing previous values | Not a complete old resource |
| livemode | boolean | D | Live/test environment |
| pending_webhooks | integer | D | Endpoints not yet successfully delivered to |
| request | object or null | D | Triggering API request metadata |
| account | string or null | C, relevant connected account | Source account |
| context | string or null | D, source/event-dependent | Authentication context for follow-up API queries |

### B2: Thin notification versus full Event

| Field | Initial notification | Retrieved full Event | Type/condition | Source |
|---|---|---|---|---|
| id / type | Present | Present | string; event ID/type | S2, S5 |
| object | v2.core.event in S2 example | v2.core.event | string | S2, S5 |
| created | Present | Present | Time string; RFC3339 fractional seconds in S2/S5 examples | S2, S5 |
| livemode | Present | Present | boolean | S2, S5 |
| context | Event-dependent | Nullable | string or null | S2, S5 |
| reason | Event-dependent | Nullable | object or null | S2, S5 |
| related_object | When a related resource exists | Nullable | id:string, type:string, url:string | S2, S5 |
| data | **Full data not included in lightweight notification** | May be provided | object or null; event-dependent | S2 |
| changes | **Not included in lightweight notification** | May be provided | object or null | S2 |
| snapshot_event | Not required for every notification | May be provided for a corresponding Snapshot | string or null | S5 |

### Business type dispatch

| Mode | Type selector | Resource access | Full schema |
|---|---|---|---|
| Snapshot | type | data.object; parse by resource object/API version | [Snapshot catalog](https://docs.stripe.com/api/events/types) |
| Thin | type | related_object; fetch full Event by event ID if needed | [Thin catalog](https://docs.stripe.com/api/v2/core/events/event-types) |
| Thin without resource | Some events lack related_object | Do not require fetchRelatedObject | S1, S2 |
| Connect/organization | account/context | Supply matching account/context on API requests | S1 |

### B3: Issuing real-time authorization

| Path | Type | Meaning | Source |
|---|---|---|---|
| type | string | issuing_authorization.request | S4 |
| data.object | Issuing Authorization | Not an ordinary notification inbox object | S4 |
| data.object.status | string | pending while awaiting decision | S4 |
| data.object.approved | boolean | Example pending value false is not a final rejection | S4 |
| data.object.amount | integer | 0 while pending; not the amount currently requested | S4 |
| data.object.pending_request | object | Pending decision request | S4 |
| pending_request.amount / currency | integer / string | Current requested amount/currency | S4 |
| pending_request.is_amount_controllable | boolean | true permits response amount control | S4 |

## 6. Response contracts

### R1: ordinary notifications

| Item | Exact rule | Source |
|---|---|---|
| Success | `2xx` | S1 |
| Body | No uniform business JSON specified | S1 |
| Deadline | Respond promptly; no uniform seconds value for all ordinary notifications | S1 |
| Redirects | `3xx` counts as failure, not acknowledgement | S1 |
| Challenge | No general challenge handshake | S1 registration/receipt workflow |

### R2: synchronous Issuing decision

| Part | Constraint | Presence | Source |
|---|---|---|---|
| HTTP status | `200` | R | S4 |
| Stripe-Version response header | Valid Stripe API version | R | S4 |
| Content-Type response header | If sent, only application/json accepted | O | S4 |
| Body.approved | boolean; approve/decline | R | S4 |
| Body.amount | Positive integer; only if pending_request.is_amount_controllable=true | O/C | S4 |
| Body.metadata | Key-value pairs | O | S4 |
| Body.send_fraud_challenges | S4 preview-feature restrictions | O, preview eligibility required | S4 |
| Deadline | 2 seconds | R | S4 |
| Timeout/error | Decision follows timeout / Autopilot configuration | Configuration-dependent | S4 |

```http
HTTP/1.1 200 OK
Content-Type: application/json
Stripe-Version: 2025-03-31.basil
```

```json
{ "approved": false }
```

### Business effects of ordinary ACKs

| Scenario | Effect | Source |
|---|---|---|
| Account-level invoice.created | Failed ACK can affect automatic finalization timing | Billing rules linked by S1 |
| Some Checkout flows | ACK can affect redirect waiting | Checkout rules linked by S1 |
| Organization destinations | Cannot subscribe to issuing_authorization.request; some Checkout/Billing waiting behavior differs | S1 organization limitations |

## 7. Delivery semantics

| Item | Rule | Source |
|---|---|---|
| Live automatic retries | Up to 3 days, exponential backoff | S1 |
| Sandbox retries | 3 retries over several hours | S1 |
| Manual redelivery | Dashboard within 15 days of creation; CLI within 30 days | S1 |
| Manual versus automatic | Successful manual redelivery does not cancel the automatic retry flow | S1 |
| Duplicates/order | Duplicates possible; creation-order delivery not guaranteed | S1 |
| Deduplication | id identifies events; same resource+type may have distinct events, separate from business idempotency | S1 |

## 8. Official sources

| ID | Source | Scope |
|---|---|---|
| S1 | [Receive Stripe events](https://docs.stripe.com/webhooks) | HTTP, signatures, retries, organization limits |
| S2 | [How events work](https://docs.stripe.com/events/how-events-work) | Snapshot/Thin notifications versus full objects |
| S3 | [Snapshot Event object](https://docs.stripe.com/api/events/object) | Types and nullability |
| S4 | [Issuing real-time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations) | Authorization body, responses, 2-second deadline |
| S5 | [Events v2 object](https://docs.stripe.com/api/v2/core/events/object) | Full Thin Event attributes |
