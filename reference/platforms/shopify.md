---
title: Shopify Webhook HMAC, resources, and privacy compliance protocol | NoMail
description: Reference HMAC-SHA256, delivery headers, field selection, three privacy compliance requests, acknowledgement deadlines, CLI tests, and retries for HTTPS Webhooks.
---

# Shopify Webhook protocol

[Platform index](../webhook-platform-reference-2026-10-30.md) · [Constraint markers and algorithms](../webhook-contract-conventions.md)

## 1. Scope and versions

| Item | Definition |
|---|---|
| Checked | 2026-11-08 |
| Applies to | App Webhook HTTPS delivery; HTTP POST + JSON |
| Excludes | EventBridge/PubSub wrappers; specialized secret sources for merchant-admin-created notifications |
| Versions | Interpret body with topic schema matching actual X-Shopify-API-Version |
| Resources | Default REST resource shape for topic; not GraphQL results or universal data/event wrapper |

## 2. Configuration parameters

| Parameter | Type/constraint | Effect | Source |
|---|---|---|---|
| topics / topic | Topic string/GraphQL enum, e.g. orders/create / ORDERS_CREATE | Subscription | S5, S6 |
| uri | Full HTTPS URL; app development configuration may use relative path | Destination | S2, S5 |
| api_version | App-level webhooks.api_version; shop-specific version from subscription-creation API | Serialization schema | S5 |
| App Client Secret | Raw app shared secret | A1; not shop Admin API Access Token | S2 |
| include_fields / includeFields | O, field-path array; dot-separated nested paths | P2 field selection | S1 |
| filter | O, filter expression | Delivery selection, not signature algorithm | S1, S5 |
| name | O | May appear in X-Shopify-Name | S1 |
| compliance_topics | Compliance topics | SH-DATA / CUSTOMER-REDACT / SHOP-REDACT | S3 |

## 3. Request registry

| ID | X-Shopify-Topic / trigger | Authentication | Body | Response |
|---|---|---|---|---|
| SH-RESOURCE | Resource topics such as products/update, orders/create | A1 | P1; P2 if fields selected | R1 |
| SH-DELETE | Deletion topics such as products/delete | A1 | Deletion schema, not full resource | R1 |
| SH-UNINSTALL | app/uninstalled | A1 | Topic's shop/app lifecycle structure | R1 |
| SH-DATA | customers/data_request | A1 | P3 | R2 |
| SH-CUSTOMER-REDACT | customers/redact | A1 | P4 | R2 |
| SH-SHOP-REDACT | shop/redact | A1 | P5 | R2 |
| SH-CLI | CLI-generated sample for topic | A1 with CLI Client Secret | Fixed sample for topic | R1; no CLI retries |

## 4. Authentication contract A1

| Item | Exact rule | Source |
|---|---|---|
| K | UTF8(raw App Client Secret) | S2 |
| Header | X-Shopify-Hmac-Sha256; standard Base64, not Hex | S2 |
| Calculation | `expected = B64(HMAC256(K, B))` | S2 |
| Comparison | Constant-time on decoded bytes or encoded text | S2 |
| Input | Entire raw JSON body, never reserialized | S2 |
| Uncovered headers | Topic, Shop-Domain, API-Version, Webhook-Id, etc. not in signature input | S2 algorithm |
| Time window | No signed timestamp; Triggered-At is not HMAC-covered time authentication | S1, S2 |
| Rotation | May take up to 1 hour to use new Client Secret for digests | S2 |
| Credential distinction | Not OAuth callback query HMAC or shop Access Token | S2 |

### Headers

| Name | Type/meaning | Condition | Source |
|---|---|---|---|
| X-Shopify-Topic | string, resource topic | HTTPS delivery metadata | S1 |
| X-Shopify-Hmac-Sha256 | Base64 string | HTTPS source verification | S1, S2 |
| X-Shopify-Shop-Domain | string, myshopify.com domain | Shop context | S1 |
| X-Shopify-API-Version | string | Actual serialization version | S1 |
| X-Shopify-Webhook-Id | string | Single-delivery deduplication key | S1, S2 |
| X-Shopify-Event-Id | string | Shared by deliveries from the same merchant action | S1, S2 |
| X-Shopify-Triggered-At | Timestamp text | Trigger-time metadata | S1 |
| X-Shopify-Name | string | O, when subscription name configured | S1 |

## 5. Body contracts

### P1: resource topics

| Topic | Body projection | Constraint/full definition |
|---|---|---|
| products/create, products/update | id:integer, title:string, status:string, variants:object[], updated_at:time string | S1 example; full fields per S6 version |
| products/delete | id:integer and topic-specific deletion fields | Do not require title/variants; S6 |
| orders/create, orders/updated | id, amounts, order state, line_items, etc. | S6; do not apply product fields to orders |
| app/uninstalled | Topic-specific object | Distinct from shop/redact; S6 |
| Other topics | Each topic's resource or specialized object | S6 complete catalog |

| Field handling | Constraint |
|---|---|
| Types | Monetary fields such as price may be strings; use topic schema |
| Wrapper | Body is directly a resource/specialized object, not event/data.object |
| Requiredness | Version, permissions, topic, and field selection affect fields; do not infer all resource requirements from product examples |

### P2: include_fields selection

| Condition | Exact result | Source |
|---|---|---|
| No include_fields | Full topic resource payload by default | S1 |
| include_fields configured | Only selected paths; relevant portions of nested objects/arrays retained | S1 |
| Combined with filter | Filter-referenced fields must also be in include_fields | S1 |
| Identical selected payloads | Short-window debouncing may discard later identical payloads | S1 |
| Avoid merging identical projections | Include changing fields such as updated_at | S1 recommendation, not global requiredness |

Selected product update example, not a complete product schema:

```json
{
  "id": 123456789,
  "variants": [{ "id": 987654321, "price": "19.99" }],
  "updated_at": "2026-11-08T00:00:00Z"
}
```

### P3–P5: compliance requests (S3)

S3 provides official examples and purposes, not a universal per-field Required/Optional table. Types below are E/D; customer fields have explicit conditions. Do not promote every example field to required.

| Field | Type | customers/data_request | customers/redact | shop/redact |
|---|---|---|---|---|
| shop_id | integer | Shop ID | Shop ID | Shop ID |
| shop_domain | string | Shop domain | Shop domain | Shop domain |
| customer | object | Customer requesting access | Customer requesting deletion | — |
| customer.id | integer | Record-dependent; not required for all requests | Same | — |
| customer.email / phone | string | Record-dependent; S3 explicitly allows email only in some cases | Same | — |
| orders_requested | integer[] | Order IDs whose data is requested | — | — |
| data_request.id | integer | Access request ID | — | — |
| orders_to_redact | integer[] | — | Order IDs to delete/redact | — |

| Type | Trigger/obligation | Source |
|---|---|---|
| customers/data_request | Customer requests access; supply stored data to shop owner, not personal data in ACK body | S3 |
| customers/redact | Customer deletion request; clean data by IDs; normally sent 10 days after request, scheduled gift cards may delay | S3 |
| shop/redact | Clean shop data 48 hours after app uninstall | S3 |

## 6. Response contracts

| ID | Item | Exact rule | Source |
|---|---|---|---|
| R1 | Success | `2xx`; `200 OK` preferred in official wording | S2 |
| R1 | Connection deadline | 1 second | S2 |
| R1 | Total deadline | 5 seconds including connection and processing | S2 |
| R1 | Body | No fixed business JSON or required challenge echo | S2 workflow |
| R1 | Redirects | `3xx` is failure | S2 |
| R2 | Compliance ACK | `2xx`; receipt only, not completion | S3 |
| R2 | Invalid compliance HMAC | **401 Unauthorized** | S3 |
| R2 | Business completion | Within 30 days of receipt; S3 exceptions for legally required retention | S3 |

## 7. Delivery semantics

| Item | Exact rule | Source |
|---|---|---|
| Retries | 8 retries over the next 4 hours after failure | S2 |
| Subscription deletion | S2 describes automatic deletion after consecutive failures for Admin API-managed subscriptions; not every management mode | S2 |
| Delivery deduplication | X-Shopify-Webhook-Id | S2 |
| Business action correlation | Multiple subscriptions produce distinct Webhook-Ids but may share Event-Id | S2 |
| CLI samples | Fixed per topic; do not cover all content variants | S4 |
| CLI failures | No automatic retries | S4 |
| CLI signatures | client-secret parameter creates verifiable HMAC | S4 |
| CLI validation scope | Does not validate actual API subscriptions; trigger real shop activity for end-to-end testing | S4 |

## 8. Official sources

| ID | Source | Scope |
|---|---|---|
| S1 | [Delivery structure](https://shopify.dev/docs/apps/build/webhooks/delivery-structure) | Headers, resources, field selection, debouncing |
| S2 | [Verify deliveries](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries) | HMAC, deadlines, retries |
| S3 | [Privacy law compliance](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance) | Three compliance payloads, 401, 30 days |
| S4 | [CLI webhook trigger](https://shopify.dev/docs/api/shopify-cli/app/app-webhook-trigger) | Test signing, fixed samples, no retries |
| S5 | [Subscribe](https://shopify.dev/docs/apps/build/webhooks/subscribe/) | Subscription fields/versions |
| S6 | [Webhooks reference](https://shopify.dev/docs/api/webhooks) | Full topic resource schemas |
