---
title: GitHub Webhook configuration, signatures, and payload protocol | NoMail
description: Reference GitHub JSON and form encodings, HMAC-SHA256 verification, Ping and event fields, the 10-second acknowledgement deadline, and manual redelivery semantics.
---

# GitHub Webhook protocol

[Platform index](../webhook-platform-reference-2026-10-30.md) · [Constraint markers and algorithms](../webhook-contract-conventions.md)

## 1. Scope and versions

| Item | Definition |
|---|---|
| Checked | 2026-11-08 |
| Applies to | GitHub.com repository, organization, GitHub App, and other HTTP Webhooks; see S1 Availability for event scope |
| Transport | HTTP POST; JSON or URL-encoded form |
| Event version | Current GitHub event definitions; REST API version headers are not automatically Webhook payload versions |
| Coverage | Complete HTTP/authentication/ACK contract; parse event resources against the specific action's S1 schema |

## 2. Configuration parameters

| Parameter | Platform requirement | Purpose | Source |
|---|---|---|---|
| Payload URL | Full receiver URL | POST destination | S2 |
| Content type | application/json or application/x-www-form-urlencoded | Select B1/B2 | S2 |
| Secret | O; high-entropy random text | Raw signing secret, not PAT/OAuth/App private key | S2, S4 |
| Events | Select subscriptions | Does not change authentication | S2 |
| Active | Enable/disable | Does not change payload schema | S2 |
| SSL verification | Recommended; HTTPS | Verify receiver certificate | S3 |

## 3. Request registry

| ID | Identification | Authentication | Body | Response | Source |
|---|---|---|---|---|---|
| GH-PING | X-GitHub-Event=ping | A1; legacy A2; A0 without Secret | B1/B2 + P1 | R1 | S1, S2 |
| GH-EVENT | X-GitHub-Event is a subscribed event | Same | B1/B2 + event/action | R1 | S1 |
| GH-REDELIVERY | Historical delivery resent; event name unchanged | Same; verify this request | Original event data | R1 | S3, S5 |

## 4. Authentication contract

| ID | Condition | Header | Exact calculation | Notes |
|---|---|---|---|---|
| A0 | No Secret configured | No secret signature | No application signature | Platform permits this; receiver policy decides acceptance |
| A1 | Secret configured | X-Hub-Signature-256 | `"sha256=" + HEX(HMAC256(UTF8(secret), B))` | Fixed case-sensitive prefix; constant-time comparison |
| A2 | Legacy compatibility | X-Hub-Signature | `"sha1=" + HEX(HMAC-SHA1(UTF8(secret), B))` | New implementations should use A1 |

| Property | Exact constraint | Source |
|---|---|---|
| Coverage | All raw HTTP body bytes, including encoded form text | S1, S4 |
| Encoding | UTF-8 text; do not re-escape Unicode or reformat before verification | S4 |
| Timestamp | A1/A2 contain no signed timestamp field | S4 algorithm |
| Routing headers | Event, Delivery, and Hook-ID are not A1/A2 signature inputs | S4 algorithm |
| Format | A1: sha256= plus 64 hex characters; A2: sha1= plus 40 | S4 |

### Headers

| Name | Type/presence | Meaning | Source |
|---|---|---|---|
| X-GitHub-Event | R, string | Event type, not action | S1 |
| X-GitHub-Delivery | R, GUID text | Delivery event ID; unchanged on manual redelivery | S1, S3 |
| X-GitHub-Hook-ID | R, ID text | Webhook configuration ID | S1 |
| X-Hub-Signature-256 / X-Hub-Signature | C, Secret configured | A1/A2 | S1 |
| X-GitHub-Hook-Installation-Target-Type / ID | Delivery metadata listed in S1 | Target type and ID where the Webhook was created | S1 |
| User-Agent | GitHub-Hookshot/ prefix | Not an authentication credential | S1 |

## 5. Body contracts

### B1/B2: outer encoding

| ID | Content-Type | HTTP body | Decoding |
|---|---|---|---|
| B1 | application/json | Event JSON | Verify B → parse JSON |
| B2 | application/x-www-form-urlencoded | payload= followed by URL-encoded JSON | Verify entire B → decode form → parse payload JSON |

### P1: Ping

S1 describes these fields without marking each Required. D is used here; no requiredness is inferred.

| Path | Type | Presence | Meaning |
|---|---|---|---|
| zen | string | D | Random GitHub Zen text, not a challenge |
| hook_id | integer | D | Webhook ID being pinged |
| hook | object | D | Webhook configuration being pinged |

### Shared event context

| Path | Type | Presence (S1) |
|---|---|---|
| action | string | C, when the event defines an action; not universal |
| repository | object | C, activity in a repository |
| organization | object | C, organization Webhook or organization repository activity |
| installation | object | C, GitHub App delivery |
| enterprise | object | C, enterprise context |
| sender | object | Event-specific; may be a ghost user, not necessarily the actual actor |

### Business event dispatch

Resources below are field-path projections. The S1 anchor in each row defines full requiredness and action-specific fields.

| Event header | action / secondary identification | Body objects/fields | Full definition |
|---|---|---|---|
| push | No universal action; created/deleted/forced are boolean | P2 | [S1 push](https://docs.github.com/en/webhooks/webhook-events-and-payloads#push) |
| create / delete | ref_type=branch/tag | ref, ref_type, pusher_type; create also description, master_branch | [S1 create](https://docs.github.com/en/webhooks/webhook-events-and-payloads#create), [delete](https://docs.github.com/en/webhooks/webhook-events-and-payloads#delete) |
| issues | By action; edited etc. include changes | issue; action-specific label/assignee/milestone, etc. | [S1 issues](https://docs.github.com/en/webhooks/webhook-events-and-payloads#issues) |
| issue_comment | created/edited/deleted | issue, comment; issue.pull_request indicates a PR conversation | [S1 issue_comment](https://docs.github.com/en/webhooks/webhook-events-and-payloads#issue_comment) |
| pull_request | By action; merged means closed and pull_request.merged=true | number, pull_request; other fields by action | [S1 pull_request](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request) |
| pull_request_review | submitted/edited/dismissed; result in review.state | review, pull_request | [S1 review](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request_review) |
| pull_request_review_comment | created/edited/deleted | comment, pull_request | [S1 review_comment](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request_review_comment) |
| workflow_run | requested/in_progress/completed | workflow: object or null (R); workflow_run: object (R) | [S1 workflow_run](https://docs.github.com/en/webhooks/webhook-events-and-payloads#workflow_run) |
| workflow_job | queued/waiting/in_progress/completed | workflow_job: object (R); conditional deployment | [S1 workflow_job](https://docs.github.com/en/webhooks/webhook-events-and-payloads#workflow_job) |
| release | created/deleted/edited/prereleased/published/released/unpublished | release: object (R); changes for edited | [S1 release](https://docs.github.com/en/webhooks/webhook-events-and-payloads#release) |
| deployment_status | deployment_status.state | deployment and deployment_status: object (R) | [S1 deployment_status](https://docs.github.com/en/webhooks/webhook-events-and-payloads#deployment_status) |
| check_run / check_suite | By action | check_run / check_suite | [S1 check_run](https://docs.github.com/en/webhooks/webhook-events-and-payloads#check_run), [check_suite](https://docs.github.com/en/webhooks/webhook-events-and-payloads#check_suite) |
| installation / installation_repositories | By action | installation, repositories or repositories_added/removed | [S1 installation](https://docs.github.com/en/webhooks/webhook-events-and-payloads#installation), [installation_repositories](https://docs.github.com/en/webhooks/webhook-events-and-payloads#installation_repositories) |
| Other events | Their own definitions | Do not force one of the above resource models | [S1 complete catalog](https://docs.github.com/en/webhooks/webhook-events-and-payloads) |

### P2: Push-specific fields

All fields below are R in S1 push. Add shared context separately.

| Path | Type | Constraint |
|---|---|---|
| ref | string | Full ref, such as refs/heads/main or refs/tags/v1.0 |
| before / after | string | SHA before/after the change |
| base_ref | string or null | Present but nullable |
| created / deleted / forced | boolean | Ref created, deleted, or force-pushed |
| compare | string | Compare URL; not Gitea's compare_url |
| commits | object[] | At most 2048; not every push can be fully reconstructed from this array |
| head_commit | object or null | Must allow null |
| pusher | object | Git author/committer-related information |

## 6. Response contract R1

| Item | Exact rule | Source |
|---|---|---|
| Success | `2xx` | S3 |
| Deadline | Within 10 seconds of receipt | S3 |
| Body | No fixed business body; no challenge echo | S1, S3 |
| Ping | ACK like an ordinary delivery; zen is not a response field | S1 |
| Follow-up business actions | ACK does not perform reverse API actions such as deployment approval | Event definition |

## 7. Delivery semantics

| Item | Rule | Source |
|---|---|---|
| Automatic retry | None; redeliver manually or schedule API calls yourself | S5 |
| Redelivery ID | X-GitHub-Delivery matches the original request | S3 |
| Payload limit | 25 MB; oversized payloads are not sent, not split | S1 |
| Ordering | No global commit sequence or snapshot guarantee | No such guarantee in S1 |

## 8. Official sources

| ID | Source | Scope |
|---|---|---|
| S1 | [Webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads) | Events, fields, headers, payload limit |
| S2 | [Creating webhooks](https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks) | Configuration, JSON/form encoding |
| S3 | [Best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks) | 10-second ACK, redelivery ID |
| S4 | [Validating deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) | Signature input, encoding, comparison |
| S5 | [Handling failed deliveries](https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries) | No automatic retries |
