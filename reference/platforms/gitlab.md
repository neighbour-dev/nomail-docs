---
title: GitLab Webhook signatures and event payload protocol | NoMail
description: Reference Signing Tokens, legacy Secret Tokens, custom JSON templates, project and group events, timeouts, tests, redelivery, and automatic disabling.
---

# GitLab Webhook protocol

[Platform index](../webhook-platform-reference-2026-10-30.md) · [Constraint markers and algorithms](../webhook-contract-conventions.md)

## 1. Scope and versions

| Item | Definition |
|---|---|
| Checked | 2026-11-08 |
| Applies to | Project and group Webhooks, not instance System Hooks |
| Version boundaries | Signing Tokens, event types, and group events depend on instance version/plan; do not assume older instances support current documentation |
| HTTP | POST + JSON; custom templates must still render valid JSON |

## 2. Configuration parameters

| Parameter | Requirement/type | Effect | Source |
|---|---|---|---|
| URL | Full receiver URL | Destination | S1 |
| Signing Token | Platform-generated; shown once; not returned by API | A1 | S1 |
| Secret Token | User-configured text; legacy | A2; static value, no body signature | S1 |
| Custom headers | O; at most 20; cannot override platform delivery headers | Extra authentication headers, not changes to A1/A2 | S1 |
| Custom webhook template | O; must render valid JSON | B2 replaces default B1 | S1 |
| Trigger / SSL verification | Events and certificate verification | Event scope, TLS | S1 |
| mTLS | Self-Managed administrator configures a global client certificate | TLS client authentication, not a body field | S1 |

## 3. Request registry

| ID | Trigger/identification | Authentication | Body | Response | Source |
|---|---|---|---|---|---|
| GL-EVENT | X-Gitlab-Event identifies live event | A1/A2; may coexist by configuration | B1 default event JSON | R1 | S1, S2 |
| GL-TEMPLATE | Custom template configured; event header remains | Same; sign actual B | B2 rendered JSON | R1 | S1 |
| GL-TEST | UI/API test of a selected event | Same Webhook authentication | Selected event structure; no universal Ping schema | R1 | S1 |
| GL-RESEND | Resend Request for historical event | Still verify authentication | Original event data | R1 | S1 |

## 4. Authentication contracts

### A1: Signing Token / Standard Webhooks

| Item | Exact rule (S1) |
|---|---|
| Key format | Remove whsec_ prefix, then standard Base64-decode the remaining text |
| Required inputs | Original webhook-id text, original webhook-timestamp text, B |
| Signed bytes | `UTF8(id + "." + t + ".") || B` |
| Output | `"v1," + B64(HMAC256(K, message))` |
| Header | webhook-signature; space-separated candidates; accept any matching supported v1 candidate |
| Timestamp | Unix seconds at request generation; freshness must be checked, but S1 specifies no uniform tolerance in seconds |
| Rotation | Parse a signature list; current documentation says one is currently sent, not a permanent list length limit |

```text
K = B64DEC(remove_prefix(signing_token, "whsec_"))
M = UTF8(webhook_id + "." + webhook_timestamp + ".") || B
expected = "v1," + B64(HMAC256(K, M))
valid = any(CT_EQ(expected, candidate) for candidate in split_on_spaces(signature_header))
```

### A2: legacy Secret Token

| Item | Exact rule (S1) |
|---|---|
| Verification | CT_EQ(X-Gitlab-Token, configured Secret Token) |
| Body integrity | Does not cover body; relies on HTTPS transport protection |
| Coexistence with A1 | Both may be configured; receiver migration policy must explicitly decide fallback |
| Downgrade boundary | Endpoints expecting A1 must not accept A2/anonymous solely because a signature is missing |

### Headers

| Name | Presence/type | Meaning | Source |
|---|---|---|---|
| X-Gitlab-Event | D, string | E.g. Push Hook, Merge Request Hook | S1 |
| webhook-id | Current S1 describes it on every request | Unique message ID, stable on retries, equal to Idempotency-Key | S1 |
| webhook-timestamp | Current S1 describes it on every request | Unix seconds | S1 |
| webhook-signature | C, Signing Token configured | A1 candidate list | S1 |
| X-Gitlab-Token | C, legacy Secret Token configured | A2 static value | S1 |
| Idempotency-Key | Legacy compatibility | Equal to webhook-id | S1 |
| X-Gitlab-Event-UUID | D | Recursively triggered Webhooks may share this; not a unique message ID | S1 |
| X-Gitlab-Webhook-UUID | D | Webhook identifier, not a per-event deduplication ID | S1 |
| X-Gitlab-Instance / User-Agent | D | Instance domain / GitLab version metadata | S1 |

## 5. Body contracts

### B1: default events

These dispatch rules and paths are **not full resource schemas**. Each S2 anchor defines the complete structure, version changes, and conditional fields.

| X-Gitlab-Event / category | Type and key paths | Action/status | Official structure |
|---|---|---|---|
| Push Hook | object_kind=push; ref:string, before/after:string, commits:object[], total_commits_count:integer, project:object | Branch ref changes | [S2 push](https://docs.gitlab.com/user/project/integrations/webhook_events/#push-events) |
| Tag Push Hook | object_kind=tag_push; ref, before, after, project | Tag ref changes | [S2 tag](https://docs.gitlab.com/user/project/integrations/webhook_events/#tag-events) |
| Issue Hook / Work item | object_kind=issue or work_item; object_attributes, user, project, changes | object_attributes.action | [S2 work item](https://docs.gitlab.com/user/project/integrations/webhook_events/#work-item-events) |
| Note Hook | object_kind=note; object_attributes.note/noteable_type; associated issue/merge_request/commit/snippet | object_attributes.action=create/update | [S2 comment](https://docs.gitlab.com/user/project/integrations/webhook_events/#comment-events) |
| Merge Request Hook | object_kind=merge_request; object_attributes, changes, user, project, assignees/reviewers/labels | object_attributes.action | [S2 MR](https://docs.gitlab.com/user/project/integrations/webhook_events/#merge-request-events) |
| Pipeline Hook | object_kind=pipeline; object_attributes, builds[], commit, project | object_attributes.status | [S2 pipeline](https://docs.gitlab.com/user/project/integrations/webhook_events/#pipeline-events) |
| Job Hook | object_kind=build; build_id:integer, build_name:string, pipeline_id:integer | **Top-level** build_status | [S2 job](https://docs.gitlab.com/user/project/integrations/webhook_events/#job-events) |
| Deployment Hook | object_kind=deployment; deployment_id, environment, deployable_id | **Top-level** status | [S2 deployment](https://docs.gitlab.com/user/project/integrations/webhook_events/#deployment-events) |
| Release Hook | object_kind=release; tag, name, description, assets | **Top-level** action | [S2 release](https://docs.gitlab.com/user/project/integrations/webhook_events/#release-events) |
| Wiki Page Hook | object_kind=wiki_page; object_attributes, wiki | object_attributes.action | [S2 wiki](https://docs.gitlab.com/user/project/integrations/webhook_events/#wiki-page-events) |
| Feature flag | Event-specific object | Do not reuse MR fields | [S2 feature flag](https://docs.gitlab.com/user/project/integrations/webhook_events/#feature-flag-events) |
| Emoji / Milestone | Corresponding event objects | Event-specific | [S2 emoji](https://docs.gitlab.com/user/project/integrations/webhook_events/#emoji-events), [milestone](https://docs.gitlab.com/user/project/integrations/webhook_events/#milestone-events) |
| Vulnerability / Access token / Duo flow | Type-specific | Version/plan/feature-dependent | [S2 catalog](https://docs.gitlab.com/user/project/integrations/webhook_events/) |
| Group member / Project / Subgroup | Group-specific structures | Event-specific | [S2 group events](https://docs.gitlab.com/user/project/integrations/webhook_events/#events-triggered-for-group-webhooks-only) |

### Explicit constraints on default structures

| Object | Constraint | Source |
|---|---|---|
| Push.commits | Only latest 20 when more than 20 commits; actual count in total_commits_count | S2 |
| Branch creation without commits | commits may be empty | S2 |
| MR.object_attributes.action | open, close, reopen, update, approval, approved, unapproval, unapproved, merge | S2 |
| MR.changes | Changed fields only; may be empty; not the full current object | S2 |
| MR.oldrev | Present on update with actual code changes | S2 |
| MR.system_action | Reason for system-triggered action when system=true | S2 |
| Note.noteable_type | Commit / MergeRequest / Issue / Snippet select different associated objects | S2 |
| Confidential note | event_type may be confidential_note; do not rely only on Note Hook header | S2 |

### B2: custom JSON template

| Item | Rule (S1) |
|---|---|
| Encoding | Must render valid JSON |
| Fields | Template-defined; default object_kind, project, object_attributes no longer guaranteed |
| References | Dot paths for nested properties; templates cannot access array properties |
| Authentication | Sign actual transmitted B, not template source or default event object |
| Example | Valid template output, not a default Push schema |

```json
{ "event": "push", "project_name": "Example" }
```

## 6. Response contract R1

| Item | Exact rule | Source |
|---|---|---|
| Success | UI/tests accept `200–299`; `200` / `201` recommended | S1 |
| Body | May be empty; response headers/body are saved for diagnostics, not required business JSON | S1 |
| GitLab.com timeout | 10 seconds | S3 |
| Self-Managed timeout | Administrator-configurable webhook_timeout, not fixed at 10 seconds for every instance | S4 |
| URL verification | No challenge handshake defined; Test sends selected event | S1 |

## 7. Delivery semantics

| Item | Rule | Source |
|---|---|---|
| Redelivery ID | Resend uses same data and Idempotency-Key / webhook-id | S1 |
| Automatic disabling | When documented feature is enabled: temporary after 4 consecutive failures, permanent after 40 | S1; version/feature-dependent |
| Recovery | Successful `2xx` test may re-enable | S1 |
| Duplicates | Project and group subscriptions may both deliver the same activity | S1 |
| .com payload limit | 25 MB | S3 |
| Global ordering | No strict global ordering guarantee in listed sources | S1, S2 |

## 8. Official sources

| ID | Source | Scope |
|---|---|---|
| S1 | [Webhooks](https://docs.gitlab.com/user/project/integrations/webhooks/) | Configuration, signatures, headers, tests, ACK, disabling |
| S2 | [Webhook events](https://docs.gitlab.com/user/project/integrations/webhook_events/) | Project/group events and structures |
| S3 | [GitLab.com Webhook limits](https://docs.gitlab.com/user/gitlab_com/#webhooks) | .com 10-second timeout and payload limits |
| S4 | [Instance limits](https://docs.gitlab.com/administration/instance_limits/#webhook-timeout) | Self-Managed timeout configuration |
