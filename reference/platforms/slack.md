---
title: Slack events, commands, and interaction callback HTTP protocol | NoMail
description: Reference signatures, form encodings, request fields, responses, and three-second acknowledgements for Events API, URL verification, Slash Commands, buttons, modals, and dynamic menus.
---

# Slack Webhook and interaction callback protocol

[Platform index](../webhook-platform-reference-2026-10-30.md) · [Constraint markers and algorithms](../webhook-contract-conventions.md)

## 1. Scope and versions

| Item | Definition |
|---|---|
| Checked | 2026-11-08 |
| Transport | HTTP POST; separate URLs for Events, Interactivity, Options Load, and Slash Commands |
| Excludes | Socket Mode, Incoming Webhooks sent to Slack, full legacy attachment/dialog specifications |
| Implementation evidence | SSL probes checked against official Bolt JS commit 6cf7b0c7adb63f67310d54f23c8a98565640925d |
| Field scope | Ordinary HTTP apps; Functions/Deno-only fields are separate, not universally required |

## 2. Configuration parameters

| Parameter | Location/constraint | Effect | Source |
|---|---|---|---|
| Signing Secret | Basic Information → App Credentials | A1; not Bot/OAuth/Client Secret | S2 |
| Events Request URL | Event Subscriptions | SK-VERIFY / EVENT / LIMIT | S1, S3 |
| Interactivity Request URL | Interactivity & Shortcuts | Actions, shortcuts, views | S4 |
| Options Load URL | Interactivity & Shortcuts | SK-OPTIONS | S8 |
| Slash Command Request URL | Per-command configuration | SK-COMMAND / SSL | S7 |
| OAuth scopes / installation grants | Determine event visibility | Do not replace inbound signatures | S1 |
| TLS | HTTPS for public distribution; check feature-specific certificate requirements | Transport | S3, S4, S7 |

## 3. Request registry

| ID | Outer encoding | Exact identification | Authentication | Body | Response |
|---|---|---|---|---|---|
| SK-VERIFY | JSON | type=url_verification | A1 | P1 | R1 |
| SK-EVENT | JSON | type=event_callback | A1 | P2 | R2 |
| SK-LIMIT | JSON | type=app_rate_limited | A1 | P3 | R2 |
| SK-ACTION | payload form | payload.type=block_actions | A1 | P4 | R3 |
| SK-SHORTCUT | payload form | payload.type=shortcut | A1 | P5 | R3 |
| SK-MESSAGE-ACTION | payload form | payload.type=message_action | A1 | P5 | R3 |
| SK-SUBMIT | payload form | payload.type=view_submission | A1 | P6 | R4 |
| SK-CLOSE | payload form | payload.type=view_closed | A1 | P6 | R3 |
| SK-OPTIONS | payload form | payload.type=block_suggestion | A1 | P7 | R5 |
| SK-COMMAND | Direct-field form | command field | A1 | P8 | R6 |
| SK-SSL | Direct-field form | ssl_check **string value exactly 1** | A2, non-business probe | P9 | R7 |

## 4. Authentication contracts

### A1: signature

| Item | Exact constraint (S2) |
|---|---|
| K | UTF8(raw Signing Secret); no Base64/Hex decoding |
| Timestamp header | X-Slack-Request-Timestamp, original Unix-seconds text |
| Signature header | X-Slack-Signature, v0= plus 64 hex characters |
| Signed message | `UTF8("v0:" + t + ":") || B` |
| Expected | `"v0=" + HEX(HMAC256(K, message))` |
| Comparison | Constant-time |
| Freshness | Official procedure checks absolute difference from current time ≤ 300 seconds |
| Coverage | JSON, payload forms, and direct-field forms all sign **entire raw HTTP B** |
| Legacy token | Deprecated; not a business authentication fallback after A1 fails |

### A2: SSL probe exception

| Item | Exact constraint | Source |
|---|---|---|
| Purpose | SSL connectivity checks for publicly distributed command URLs | S7 |
| Fields | ssl_check=1, token (legacy Verification Token) | S7 |
| Signature | Official Bolt JS handles this probe without requiring a signature | S9 implementation, not a universal promise for all SDKs |
| Allowed action | Probe ACK only, no event/command dispatch | S9 |
| Isolation | S9 discards accompanying payload and other content, retaining only ssl_check=1 | S9 |
| Security requirement | Mere presence of ssl_check must not exempt arbitrary business requests from verification | Derived from S9's exact check and isolation |

### Optional TLS client authentication

| Item | S2 requirement |
|---|---|
| mTLS CA | DigiCert root chain; verify client certificate chain |
| Identity | SAN DNS=platform-tls-client.slack.com; CN as compatibility candidate |
| Proxy forwarding | Trusted TLS terminator must inject identity headers and strip client-supplied namesakes |

## 5. Body contracts

### Encoding

| Encoding | Content-Type | Processing |
|---|---|---|
| JSON | application/json | Verify B → parse JSON |
| payload form | application/x-www-form-urlencoded | Verify entire B → decode form → parse payload JSON |
| Direct-field form | application/x-www-form-urlencoded | Verify entire B → read form fields directly, not payload |

### P1: URL verification (S3)

| Field | Type | Presence | Constraint |
|---|---|---|---|
| type | string | R | url_verification |
| challenge | string | R | Random value; echo unchanged |
| token | string | D, deprecated | Does not replace business signature |

### P2: event envelope (S1)

| Field | Type | Rule/meaning |
|---|---|---|
| type | string | event_callback |
| team_id | string | Workspace context |
| api_app_id | string | Target App |
| event_id | string | Globally unique event ID across workspaces |
| event_time | integer | Dispatch time, Unix seconds |
| event | object | Inner event; dispatch by event.type and possible subtype |
| authorizations | object[] | Summary of installations able to see event; do not duplicate event per authorization |
| event_context | string | Query full visible authorizations; not provided for every event |
| context_team_id / context_enterprise_id | string or null, context-dependent | Installation context used for delivery |
| is_ext_shared_channel | boolean | Shared channel context |

These are S1 field descriptions; unspecified requiredness is not promoted to R.

| Inner event category | Field-path projection | Full definition |
|---|---|---|
| message | type, subtype, channel, ts; text/user/message etc. depend on subtype | [Message events](https://docs.slack.dev/reference/events/message/) |
| reaction_added / removed | user, reaction, item, item_user, event_ts | [Event catalog](https://docs.slack.dev/reference/events/) |
| file / app / team, etc. | Corresponding inner event object | [Event catalog](https://docs.slack.dev/reference/events/) |

### P3: rate-limit notification (S1)

| Field | Type | Meaning |
|---|---|---|
| type | string | app_rate_limited |
| team_id / api_app_id | string | Limited workspace/App |
| minute_rate_limited | integer | Unix seconds rounded to the minute |
| token | string | Deprecated |
| event | — | Not an event_callback envelope |

### P4: Block actions (S5)

Applies to **decoded payload JSON**.

| Path | Type | Presence | Meaning |
|---|---|---|---|
| type | string | R | block_actions |
| trigger_id | string | R | Short-lived modal-opening credential |
| user | object | R | Actor |
| team | object or null | R | null for org-installed apps |
| container | object | R | message/view etc. container |
| api_app_id | string | R | App ID |
| actions | object[] | S5 marks O | Triggering component actions |
| actions[].block_id / action_id | string | C, within action item | Component location |
| actions[].type | string | Component-dependent | button/static_select, etc. |
| actions[].value | Component-dependent | **Not universally present**; see source conflicts | Custom value or selected result |
| channel / message / view | object | O, interface-dependent | Context; all three not guaranteed |
| state | object | O | Values of other stateful components |
| response_url | string | O; deprecated in Functions | Sensitive temporary response capability |
| function_data / interactivity / bot_access_token | object / object / string | Functions-only | Not globally required for ordinary HTTP apps |

### P5: shortcuts (S10)

| Field | Type | shortcut | message_action |
|---|---|---|---|
| type | string | shortcut | message_action, not message_actions |
| callback_id | string | Configured entry ID | Configured entry ID |
| user / team | object | Actor/workspace | Actor/workspace |
| trigger_id | string | Short-lived trigger credential | Short-lived trigger credential |
| message / channel | object | No message context | Selected message/channel |
| response_url | string | Not provided | Provided for message shortcut |

### P6: views (S6)

| Path | Type | view_submission | view_closed |
|---|---|---|---|
| type | string | R, view_submission | D, view_closed |
| team | object or null | R, nullable for org-installed | D |
| user / view | object | R | D |
| api_app_id | string | R | In official example |
| view.state.values | map | O; block_id → action_id → component value | Do not consume as submission results |
| is_cleared | boolean | — | Whether entire view stack was closed |
| response_urls | object[] | O, when view configuration permits generation | — |
| function_data / interactivity / bot_access_token | Specialized structures | Functions-only | Not globally required |

### P7: menu options loading (S8, S11)

| Path | Type | Presence | Constraint |
|---|---|---|---|
| type | string | S11 example/type definition | block_suggestion |
| user / team | object | R | Context |
| api_app_id | string | R | App ID |
| block_id / action_id | string | R | Menu component location |
| value | string | R | User-entered query text |
| channel / message / view | object | O | Interface-dependent |
| function_data / bot_access_token | object / string | Functions-only | Not required for ordinary apps |

### P8: Slash Command (S7)

| Direct form field | Type | Constraint/meaning |
|---|---|---|
| command | string | Includes slash, e.g. /example |
| text | string | Raw input after command; may be empty |
| user_id / channel_id / team_id | string | Actor, channel, workspace |
| enterprise_id / enterprise_name | string | C, Enterprise context |
| api_app_id | string | Target App ID |
| response_url | string | Temporary reply URL, not event ID |
| trigger_id | string | Modal trigger credential |
| token | string | Deprecated, not an A1 substitute |
| user_name and other *_name | string | Display information, not stable identifiers |

### P9: SSL probe

```text
ssl_check=1&token=example-legacy-token
```

## 6. Response contracts

| ID | Request | Success/deadline | Content-Type / Body | Source |
|---|---|---|---|---|
| R1 | URL verification | `200`; immediately | text/plain original challenge, form challenge=..., or JSON {"challenge":"..."} | S3 |
| R2 | Events notification | `2xx`, within 3 seconds | No fixed business body; `200` recommended | S1 |
| R3 | actions/shortcut/close | `200`, within 3 seconds | May be empty; business feedback via API/response_url | S4 |
| R4 | view_submission | `200`, within 3 seconds | Empty body closes current view, or response_action JSON | S6, S12 |
| R5 | block_suggestion | `200`, 3-second interaction ACK deadline | application/json, options or option_groups | S4, S8 |
| R6 | Slash Command | `200`, within 3000 ms | Empty, plain text, or message JSON | S7 |
| R7 | ssl_check | `200` | Empty body; probe only, no business processing | S7, S9 |

### R4: view responses

| response_action | Required data | Result |
|---|---|---|
| None; empty body | — | Close submitted view |
| errors | errors map: block_id → error text | Keep form and show errors |
| update | view: new view object | Update current view |
| push | view: new view object | Push new view; at most 3 stack levels |
| clear | No extra view | Clear view stack |

### R5: options response

| Field | Type | Constraint (S8) |
|---|---|---|
| options | option[] | Mutually exclusive with option_groups; at most 100 |
| option_groups | option_group[] | At most 100 groups, 100 options each |
| option.text | plain_text object | Display text |
| option.value | string | Selection value |

```json
{ "options": [{ "text": { "type": "plain_text", "text": "Example" }, "value": "example" }] }
```

### R6: command message response

| Field | Type | Constraint (S7) |
|---|---|---|
| text / blocks | string / object[] | Message format definitions |
| response_type | string | ephemeral (default) or in_channel |
| HTTP status versus business error | — | Report input errors inside a `200` message; distinct from communication failure |

## 7. Delivery and temporary credentials

| Item | Exact rule | Source |
|---|---|---|
| Events retries | Up to 3 after failure: nearly immediately, 1 minute, 5 minutes | S1 |
| Delayed Events | If enabled, additional hourly retries for 24 hours; not default for all apps | S1 |
| Retry headers | X-Slack-Retry-Num, X-Slack-Retry-Reason; not event IDs | S1 |
| Stop retries for event | Set x-slack-no-retry: 1 in non-success response | S1 |
| Events redirects | Up to 2 redirects via 301/302; do not apply Stripe's blanket failure rule | S1 |
| response_url | For supported interactions, at most 5 replies within 30 minutes | S4 |
| trigger_id | Expires after 3 seconds; single use | S4 |
| view_closed | Only sent if view created with notify_on_close=true | S6 |

### Conflicts between official tables and examples

| Item | Official field table | Same-page example/component condition | Handling here |
|---|---|---|---|
| block_actions.actions[].value | S5 says Required | Home tab button example omits value; component value is optional | Do not require value on every action |
| block_actions.hash | S5 says Required | Examples put it in view.hash or omit top-level hash | Follow container/view definition; no forced top-level field |
| view_submission.enterprise | S6 says Required | Example omits it; semantics depend on Enterprise installation | Preserve context condition rather than inventing universal Required validation |

## 8. Official sources

| ID | Source | Scope |
|---|---|---|
| S1 | [Events API](https://docs.slack.dev/apis/events-api/) | Envelopes, limits, ACK, retries |
| S2 | [Request verification](https://docs.slack.dev/authentication/verifying-requests-from-slack/) | HMAC, freshness, mTLS |
| S3 | [HTTP Request URLs](https://docs.slack.dev/apis/events-api/using-http-request-urls/) | Challenge |
| S4 | [Handling user interaction](https://docs.slack.dev/interactivity/handling-user-interaction/) | Forms, ACK, temporary credentials |
| S5 | [block_actions](https://docs.slack.dev/reference/interaction-payloads/block_actions-payload/) | Action fields/examples |
| S6 | [View payloads](https://docs.slack.dev/reference/interaction-payloads/view-interactions-payload/) | Submission/closure fields |
| S7 | [Slash commands](https://docs.slack.dev/interactivity/implementing-slash-commands/) | Commands, SSL probes |
| S8 | [External select](https://docs.slack.dev/reference/block-kit/block-elements/select-menu-element/#external_select) | Options response limits |
| S9 | [Bolt JS HTTP receiver, pinned commit](https://github.com/slackapi/bolt-js/blob/6cf7b0c7adb63f67310d54f23c8a98565640925d/src/receivers/HTTPModuleFunctions.ts) | Official SSL probe implementation boundary |
| S10 | [Shortcuts payloads](https://docs.slack.dev/reference/interaction-payloads/shortcuts-interaction-payload/) | shortcut/message_action |
| S11 | [block_suggestion](https://docs.slack.dev/reference/interaction-payloads/block_suggestion-payload/) | Menu query fields |
| S12 | [Modals](https://docs.slack.dev/surfaces/modals/) | response_action, view stack |
