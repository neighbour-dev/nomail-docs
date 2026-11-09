---
title: Gitea Webhook encoding, signatures, and event mapping protocol | NoMail
description: Reference JSON, form, and GET signature scopes, event header mappings, payloads, timeouts, and Replay UUID changes against the official Gitea v1.25.5 implementation.
---

# Gitea Webhook protocol

[Platform index](../webhook-platform-reference-2026-10-30.md) · [Constraint markers and algorithms](../webhook-contract-conventions.md)

## 1. Scope and versions

| Item | Definition |
|---|---|
| Checked | 2026-11-08 |
| Exact baseline | **Gitea v1.25.5**; source-derived constraints apply only to this version, not mixed with latest-documentation behavior |
| Type | Generic Gitea Webhooks, not transformed Slack/Discord/Telegram integrations |
| Transport | POST JSON, POST payload form; separate GET payload query |
| Scope | repository / organization / user / system; default Webhooks are configuration copied to new repositories |

## 2. Configuration parameters

| Parameter | Value/constraint | Effect | Source |
|---|---|---|---|
| Target URL | Full receiver URL | Destination | S1 |
| HTTP Method | POST or GET | B1/B2/B3 | S1, S2 |
| POST Content Type | JSON or URL-encoded form | B1/B2 | S1, S2 |
| Secret | O, raw text | A1; secret no longer placed inside payload | S1, S2 |
| Authorization Header | O, full custom header value | A2, independent of Secret | S1, S2 |
| Trigger On / Active | Events/enabled state | Delivery scope | S1 |
| Branch Filter | glob; only events with git refs | Does not restrict all ref-less events such as Issues | S1 |
| DELIVER_TIMEOUT | [webhook], seconds, default 5, configurable | Total request timeout | S5 |

## 3. Request registry

| ID | HTTP/encoding | Authentication | Body/data location | Response |
|---|---|---|---|---|
| GT-JSON | POST application/json | A1/A2 by configuration | B1 | R1 |
| GT-FORM | POST application/x-www-form-urlencoded | A1/A2 by configuration | B2 | R1 |
| GT-GET | GET | A1/A2 by configuration | B3, empty HTTP body | R1 |
| GT-TEST | Configured delivery mode, push event | Same configuration | P1 synthetic Push | R1 |
| GT-REPLAY | Replay existing task | Current configuration's signing/authentication | Original event, new task UUID | R1 |

## 4. Authentication contracts

### A1: HMAC

| Encoding | Exact message M | Header | Expected | Source |
|---|---|---|---|---|
| B1 JSON | B | X-Gitea-Signature | HEX(HMAC256(UTF8(secret), M)) | S2 |
| B2 form | Original JSON text bytes after URL-decoding payload | Same | Same; **not entire encoded form** | S2 |
| B3 GET | Original JSON text bytes after decoding query parameter payload | Same | Same; **not empty HTTP body** | S2 |

| Signature property | Exact rule | Source |
|---|---|---|
| X-Gitea-Signature | 64 lowercase hex characters, **no prefix** | S2 |
| X-Gogs-Signature | Compatibility header with same SHA256 digest | S2 |
| X-Hub-Signature-256 | sha256= + same digest | S2 |
| X-Hub-Signature | sha1= + HMAC-SHA1 digest of same M | S2 |
| No Secret | Headers may still appear with empty digest; compatibility headers retain sha1=/sha256= only | S2 |
| Timestamp | Not included in signature | S2 |
| No reserialization | Preserve original JSON text after form/GET decoding; do not parse and reserialize before signing | S2 message source |

### A2: custom Authorization

| Item | Rule (S2) |
|---|---|
| Value | Full configured Authorization Header; no automatic token-type interpretation |
| Relationship to A1 | Authorization and signature may coexist |
| Coverage | Static header does not prove body integrity; receiver policy decides whether to require both |

### Headers

| Name | Exact meaning | Source |
|---|---|---|
| X-Gitea-Delivery | HookTask.UUID; Replay creates a new UUID | S2, S7 |
| X-Gitea-Event | Event-Type normalized through Event() | S2, S3 |
| X-Gitea-Event-Type | Exact HookEventType string | S2, S3 |
| X-Gitea-Hook-Installation-Target-Type | repository / organization / user / system, etc. | S2 |
| X-GitHub-* / X-Gogs-* | Compatibility metadata; does not prove source is GitHub/Gogs | S2 |

## 5. Body contracts

### B1/B2/B3 encodings

| ID | HTTP data | Decoding | Source |
|---|---|---|---|
| B1 | Raw event JSON | Verify B → parse JSON | S2 |
| B2 | `payload=<URL-encoded JSON>` | Decode form, preserve payload text → verify text → parse JSON | S2 |
| B3 | `?payload=<URL-encoded JSON>` | Decode query, preserve payload text → verify text → parse JSON | S2 |

### Exact event header mappings

Based on **v1.25.5 S3**. Do not copy exact Event-Type directly into Event.

| X-Gitea-Event-Type | X-Gitea-Event | Payload type (S4) |
|---|---|---|
| create / delete / fork / push | Same as Event-Type | CreatePayload / DeletePayload / ForkPayload / PushPayload |
| issues | issues | IssuePayload |
| issue_assign | issues | IssuePayload |
| issue_label | issues | IssuePayload |
| issue_milestone | issues | IssuePayload |
| issue_comment | issue_comment | IssueCommentPayload |
| pull_request | pull_request | PullRequestPayload |
| pull_request_assign | pull_request | PullRequestPayload |
| pull_request_label | pull_request | PullRequestPayload |
| pull_request_milestone | pull_request | PullRequestPayload |
| pull_request_sync | pull_request | PullRequestPayload |
| pull_request_review_request | pull_request | PullRequestPayload |
| pull_request_comment | **issue_comment** | IssueCommentPayload, timeline comment |
| pull_request_review_approved | **pull_request_approved** | PullRequestPayload + review |
| pull_request_review_rejected | **pull_request_rejected** | PullRequestPayload + review |
| pull_request_review_comment | **pull_request_comment** | PullRequestPayload + review, distinct from timeline comments |
| wiki / repository / release / package / status | Same as Event-Type | Corresponding payload |
| workflow_run / workflow_job | Same as Event-Type | WorkflowRunPayload / WorkflowJobPayload |
| pull_request_review | Subscription group name | S3 groups review_xxx; not an independent generic review payload |
| schedule | S3 identifies as internal Actions event | Not a generic external Webhook type here |

### Payload fields

S4 defines official types. Fields without omitempty serialize; pointers may be null. Presence is not non-nullability. Top-level fields below reference resource types from the same S4 version.

| Payload | Top-level fields/types | Conditions |
|---|---|---|
| Create | sha/ref/ref_type:string; repository/sender:object or null | No universal action |
| Delete | ref/ref_type/pusher_type:string; repository/sender:object or null | pusher_type defined as user |
| Fork | forkee/repository/sender:object or null | forkee is new Fork |
| Push (P1) | Below | No universal action |
| Issue | action:string, number:integer, issue/repository/sender:object or null, commit_id:string | changes omittable |
| IssueComment | action:string, issue/comment/repository/sender:object or null, is_pull:boolean | pull_request, changes omittable |
| PullRequest | action:string, number:integer, pull_request/requested_reviewer/repository/sender/review:object or null, commit_id:string | changes omittable; review populated by action |
| Wiki | action/page/comment:string, repository/sender:object or null | action=created/edited/deleted |
| Repository | action:string, repository/organization/sender:object or null | action=created/deleted |
| Release | action:string, release/repository/sender:object or null | action=published/updated/deleted |
| Package | action:string, package/repository/organization/sender:object or null | action=created/deleted; repository nullable |
| Status | context/description/sha/state/target_url:string, id:integer, created_at:time, commit/repository/sender:object or null, updated_at:time or null | No action; state carries status |
| WorkflowRun | action:string, workflow/workflow_run/repository/sender:object or null | pull_request, organization omittable |
| WorkflowJob | action:string, workflow_job/repository/sender:object or null | pull_request, organization omittable |

### P1: Push

| Field | Type (S4) | Meaning |
|---|---|---|
| ref | string | Full ref |
| before / after | string | Commit IDs before/after |
| compare_url | string | Compare link, distinct from GitHub compare |
| commits | object[] or null | PayloadCommit collection; Go nil slice may serialize as null |
| total_commits | integer | Commit count |
| head_commit | object or null | Head commit |
| repository / pusher / sender | object or null | Repository, pusher, actor |

| PayloadCommit field | Type (S4) |
|---|---|
| id / message / url | string |
| author / committer | PayloadUser object or null; name/email/username are string |
| verification | object or null |
| timestamp | JSON time string |
| added / removed / modified | string[] or null |

## 6. Response contract R1

| Item | Exact v1.25.5 rule | Source |
|---|---|---|
| Success | Final response code satisfies status/100==2 | S2 |
| Body | No fixed business JSON or challenge echo | S2 |
| Timeout | http.Client.Timeout=DELIVER_TIMEOUT seconds; default 5 | S2, S5 |
| Test | Synthetic Push, ACK like live requests; not Ping/challenge | S6 |

## 7. Delivery semantics

| Item | Exact v1.25.5 rule | Source |
|---|---|---|
| Replay | Copy original PayloadContent/EventType/PayloadVersion into new task | S7 |
| Replay ID | CreateHookTask generates **new UUID**, changing X-Gitea-Delivery | S7, S2 |
| Deduplication boundary | Delivery-only deduplication cannot prevent manual Replay business side effects | S7 behavior; receiver-policy conclusion |
| Automatic retries | S2/S8 sender provides no Stripe-style fixed backoff contract; do not claim fixed N retries | S2, S8 |
| Test body | before=after, one synthetic commit, total_commits=1; fake commit if repository lacks usable commit | S6 |
| Ordering | No global transactional sequence guarantee | Undefined in S2, S8 |

## 8. Official sources

All except S1 are pinned to **v1.25.5**. Type code is evidence only; third-party code is not copied into this project.

| ID | Source | Scope |
|---|---|---|
| S1 | [Webhooks documentation](https://docs.gitea.com/usage/repository/webhooks/) | Configuration concepts; current docs do not replace pinned version sources |
| S2 | [services/webhook/deliver.go](https://github.com/go-gitea/gitea/blob/v1.25.5/services/webhook/deliver.go) | Encoding, signatures, headers, success |
| S3 | [modules/webhook/type.go](https://github.com/go-gitea/gitea/blob/v1.25.5/modules/webhook/type.go) | Exact Event-Type → Event mapping |
| S4 | [modules/structs/hook.go](https://github.com/go-gitea/gitea/blob/v1.25.5/modules/structs/hook.go) | Types, serialization, null/omission |
| S5 | [modules/setting/webhook.go](https://github.com/go-gitea/gitea/blob/v1.25.5/modules/setting/webhook.go) | Default 5-second configuration |
| S6 | [routers/web/repo/setting/webhook.go](https://github.com/go-gitea/gitea/blob/v1.25.5/routers/web/repo/setting/webhook.go) | TestWebhook |
| S7 | [models/webhook/hooktask.go](https://github.com/go-gitea/gitea/blob/v1.25.5/models/webhook/hooktask.go) | Replay new tasks/UUIDs |
| S8 | [services/webhook/webhook.go](https://github.com/go-gitea/gitea/blob/v1.25.5/services/webhook/webhook.go) | Queue/task behavior |
