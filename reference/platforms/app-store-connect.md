---
title: App Store Connect Webhook signature and notification protocol | NoMail
description: Reference HMAC signatures, all subscribed event types, App and build states, TestFlight and background asset payloads, and official documentation limits for Ping.
---

# App Store Connect Webhook protocol

[Platform index](../webhook-platform-reference-2026-10-30.md) · [Constraint markers and algorithms](../webhook-contract-conventions.md)

## 1. Scope and versions

| Item | Definition |
|---|---|
| Checked | 2026-11-08 |
| Protocol | App Store Connect API Webhooks; Apple → receiver HTTP POST + JSON |
| Excludes | App Store Server Notifications for purchases/subscriptions; signedPayload/JWS verification does not apply |
| Event types | All 12 WebhookEventType values in S5 as of the checked date, listed in section 5 |
| Structural evidence | S2 business payload examples; fields without uniform Required declarations use E, not an invented required schema |

## 2. Configuration contract

| Parameter | Type | Requirement | Source |
|---|---|---|---|
| name | string | R on creation | S4 |
| url | URI | R, receiver URL | S4 |
| secret | string | R, custom hard-to-guess text | S1, S4 |
| enabled | boolean | R for API creation | S4 |
| eventTypes | WebhookEventType[] | R; select at least one in the UI | S3, S4 |
| relationships.app | App relationship | One App per Webhook; cannot change after creation | S1, S3 |
| Count | integer | At most 10 Webhooks per App | S3 |
| Role | Account role | Account Holder / Admin / App Manager | S3 |

### Directions and credentials

| Direction | Purpose | Authentication | Body.type layer |
|---|---|---|---|
| Apple → receiver | Event/Ping delivery | A1, x-apple-signature | Business notification type |
| Receiver → Apple API | Create/update subscriptions | App Store Connect JWT Bearer Token | webhooks management resource |
| Receiver → Apple API | Trigger test | JWT Bearer Token | webhookPings management request, not inbound Ping schema |
| Receiver → Apple API | Retrieve feedback/builds/resources | JWT Bearer Token | Queried resource's API type |

## 3. Request registry

| ID | Identification/trigger | Authentication | Body | Response | Source |
|---|---|---|---|---|---|
| ASC-EVENT | data.type in event table | A1 | P1 + event variant | R1 | S1, S2 |
| ASC-PING | UI Test or webhookPings API; UI labels Ping | A1; S1 signs every POST | P2, documentation boundary below | R1 | S1, S3, S6 |
| ASC-REDELIVERY | Resend historical Success/Failed delivery | A1 | Original business event; same event ID | R1 | S3 |

## 4. Authentication contract A1

| Item | Exact constraint | Source |
|---|---|---|
| K | UTF8(configured raw Secret) | S1 |
| Header | x-apple-signature; HTTP header names case-insensitive | S1 |
| Expected | `"hmacsha256=" + HEX(HMAC256(K, B))` | S1 |
| Prefix | **hmacsha256=**, not sha256= | S1 |
| Coverage | Actual raw HTTP body bytes; never reserialize JSON | S1 |
| Comparison | Constant-time | Signature security procedure referenced by S1 |
| Timestamp | No separate signed timestamp in formula; attributes.timestamp is not processed separately | S1 |
| Encryption | No uniform outer AES/JWS wrapper defined in listed sources | S1, S2 |
| Management credentials | Do not substitute App Store Connect private keys/JWTs or in-app purchase shared secrets | S1 |

## 5. Body contracts

### P1: business notification envelope

| Path | Type | Presence/constraint | Source |
|---|---|---|---|
| data | object | Wrapper used by S2 business examples | S2 |
| data.type | string | Payload type below; not the uppercase subscription enum | S2 |
| data.id | string | Business event ID, not notified resource ID | S2, S3 |
| data.version | integer | E, 1 in some examples; absent from background asset examples, not globally required | S2 |
| data.attributes | object | Event-specific attributes | S2 |
| data.relationships | object | Event-related resources | S2 |
| relationships.instance.data | object | Related resource wrapper in App/Build/feedback examples | S2 |
| relationships.instance | object | **Background asset events put id/type/links directly here, without data** | Explicit in S2 |
| relationships.marketplaceApp.data | object | Marketplace App for alternative distribution | S2 |
| attributes.timestamp | Time string | E, event-dependent, not universal | S2 |

### Complete business event enumeration

Complete S5 subscription enums mapped to S2 payloads. Attribute columns are E from S2 examples; unshown fields are not assumed forbidden.

| Subscription enum (eventTypes) | Inbound data.type | attributes fields/types | relationships |
|---|---|---|---|
| APP_STORE_VERSION_APP_VERSION_STATE_UPDATED | appStoreVersionAppVersionStateUpdated | newValue:string, oldValue:string, timestamp:time string | instance.data → appStoreVersions |
| BUILD_UPLOAD_STATE_UPDATED | buildUploadStateUpdated | newState:string; example lacks timestamp/oldState | instance.data → buildUploads |
| BUILD_BETA_DETAIL_EXTERNAL_BUILD_STATE_UPDATED | buildBetaDetailExternalBuildStateUpdated | newExternalBuildState:string, oldExternalBuildState:string, timestamp:time string | instance.data → buildBetaDetails |
| BETA_FEEDBACK_SCREENSHOT_SUBMISSION_CREATED | betaFeedbackScreenshotSubmissionCreated | timestamp:time string | instance.data → betaFeedbackScreenshotSubmissions; may have links |
| BETA_FEEDBACK_CRASH_SUBMISSION_CREATED | betaFeedbackCrashSubmissionCreated | timestamp:time string | instance.data → betaFeedbackCrashSubmissions; may have links |
| BACKGROUND_ASSET_VERSION_STATE_UPDATED | backgroundAssetVersionStateUpdated | newState:string, oldState:string, timestamp:time string | instance directly id/type/links → backgroundAssetVersions |
| BACKGROUND_ASSET_VERSION_INTERNAL_BETA_RELEASE_CREATED | backgroundAssetVersionInternalBetaReleaseCreated | timestamp:time string | instance directly id/type/links → backgroundAssetVersionInternalBetaReleases |
| BACKGROUND_ASSET_VERSION_EXTERNAL_BETA_RELEASE_STATE_UPDATED | backgroundAssetVersionExternalBetaReleaseStateUpdated | newState:string, oldState:string, timestamp:time string | instance directly id/type/links → backgroundAssetVersionExternalBetaReleases |
| BACKGROUND_ASSET_VERSION_APP_STORE_RELEASE_STATE_UPDATED | backgroundAssetVersionAppStoreReleaseStateUpdated | newState:string, oldState:string, timestamp:time string | instance directly id/type/links → backgroundAssetVersionAppStoreReleases |
| ALTERNATIVE_DISTRIBUTION_PACKAGE_VERSION_CREATED | alternativeDistributionPackageVersionCreated | appId:string, timestamp:time string | instance.data → alternativeDistributionPackageVersions; marketplaceApp.data |
| ALTERNATIVE_DISTRIBUTION_PACKAGE_AVAILABLE_UPDATED | alternativeDistributionPackageAvailableUpdated | available:boolean, territories:string[], appId:string, timestamp:time string | instance.data → alternativeDistributionPackages; marketplaceApp.data |
| ALTERNATIVE_DISTRIBUTION_TERRITORY_AVAILABILITY_UPDATED | alternativeDistributionTerritoryAvailabilityUpdated | available:boolean, territories:string[], appId:string, timestamp:time string | Example uses marketplaceApp.data; **instance not required** |

### Field semantics and resource retrieval

| Object | Exact handling | Source |
|---|---|---|
| App version state | Use newValue/oldValue, not newState | S2 |
| Build upload | Use newState; do not infer other required fields from App version model | S2 |
| External Beta state | newExternalBuildState / oldExternalBuildState | S2 |
| Screenshot/crash feedback | Payload notifies resource creation; retrieve full screenshots/logs/feedback through API | S2 |
| Background assets | Import validation failure may yield PROCESSING → FAILED; success may create internal beta release | S2 |
| territories | Preserve Apple region code strings; do not convert to locale tags | S2 |
| data.id versus instance.id | Event versus resource ID; not interchangeable for event deduplication | S2 |

### P2: Ping versus management resources

| Officially specified | Conclusion | Source |
|---|---|---|
| UI Test | Sends a test delivery shown as Ping in Recent Deliveries | S3 |
| POST /v1/webhookPings | Triggers a test; request is management API webhookPings resource | S1 |
| WebhookPing API object | id:string (R), type=webhookPings (R), links:ResourceLinks (O) | S6 DocC fields |
| Inbound Ping envelope | S1/S2/S3/S6 provide no complete field table or definitive business data.type | Do not infer webhookPings from API object or treat third-party examples as official contracts |
| Integration evidence | Inspect actual Request Payload / Response Payload in UI | S3 |

No full inbound Ping JSON schema is established here. This is an explicit documentation gap, not permission for arbitrary structures.

## 6. Response contract R1

| Item | Official constraint | Receiver policy (not an Apple promise) |
|---|---|---|
| Success statuses | Not fully enumerated by S1/S3 | Return `200` after reliable receipt |
| Body | No uniform business ACK JSON in S1/S3 | Empty body is suitable |
| Deadline | No uniform seconds value in S1/S3 | ACK immediately; fetch resources separately |
| Challenge | No handshake defined in S1/S3 | Do not invent a challenge echo endpoint |
| Decision response | State changes are notifications, not approval requests | ACK does not approve reviews/builds |

## 7. Delivery semantics

| Item | Exact rule | Source |
|---|---|---|
| Manual redelivery | Resend Success or Failed; test deliveries cannot be resent | S3 |
| Redelivery IDs | New delivery record, same event ID | S3 |
| Resend operation | An old record cannot be resent again after resending; the new record can be resent | S3 |
| UI history | Up to 20 recent deliveries from the past week | S3 |
| Automatic retry count/backoff | Unspecified in listed sources | S1, S3 |
| Global ordering | Strict global order unspecified | S1, S2 |

## 8. Official sources

| ID | Source | Scope |
|---|---|---|
| S1 | [Configuring and parsing notifications](https://developer.apple.com/documentation/appstoreconnectapi/configuring-webhook-notifications) | Signatures, management API, tests |
| S2 | [Understanding webhook events](https://developer.apple.com/documentation/appstoreconnectapi/webhook-events) | Payloads and structural differences |
| S3 | [Manage webhooks](https://developer.apple.com/help/app-store-connect/manage-your-team/manage-webhooks/) | Roles, limits, Test, Resend |
| S4 | [WebhookCreateRequest.Data.Attributes](https://developer.apple.com/documentation/appstoreconnectapi/webhookcreaterequest/data-data.dictionary/attributes-data.dictionary) · [Official DocC attributes](https://developer.apple.com/tutorials/data/documentation/appstoreconnectapi/webhookcreaterequest/data-data.dictionary/attributes-data.dictionary.json) | Required creation parameters |
| S5 | [WebhookEventType](https://developer.apple.com/documentation/appstoreconnectapi/webhookeventtype) · [Official DocC enum](https://developer.apple.com/tutorials/data/documentation/appstoreconnectapi/webhookeventtype.json) | All 12 subscription values |
| S6 | [WebhookPing](https://developer.apple.com/documentation/appstoreconnectapi/webhookping) · [Official DocC fields](https://developer.apple.com/tutorials/data/documentation/appstoreconnectapi/webhookping.json) | Management fields, not inbound event schema |
