---
title: NoMail integration guide - Connect Webhook notification sources
description: Prepare receiver URLs, platform permissions, and credentials, configure Webhooks and subscriptions on both sides, test delivery, and troubleshoot missing notifications.
---

# Connect Webhook notification sources

NoMail receives source platform events through Webhooks. Integration requires configuration in both NoMail and the source platform, not just entering a platform name.

## Before you start

- [Deploy your server](install.md) and prepare a URL reachable by the source platform. Use HTTPS for public deployments.
- Obtain permission to configure Webhooks or event subscriptions on the platform.
- Prepare the platform's receiver credentials for verifying notification origins. These are not necessarily API tokens and must not be substituted for them.

## Integration workflow

1. Create a receiver in NoMail with a name, platform, and appropriate credentials.
2. Enter NoMail's receiver URL in the platform's Webhook or event subscription settings.
3. Set matching credentials as required, select events, and enable the subscription.
4. Send a test delivery or trigger an event. Check both the delivery result and the resulting NoMail message.

Creating a NoMail receiver does not create a platform subscription. Some platforms verify the receiver URL before sending real events.

## Platform credentials

The table describes the latest stable backend's support, not a guarantee that every released App version exposes every platform in its forms. If your client lacks a platform, use a compatible client or the receiver configuration API in the [latest OpenAPI attachment](https://github.com/neighbour-dev/nomail-api/releases/latest/download/swagger.json).

| Source | Receiver credentials | Notes |
|---|---|---|
| Generic | No authentication or an HMAC secret | Authentication is recommended for public endpoints |
| [GitHub](../reference/platforms/github.md) | Webhook Secret | Not a personal access token |
| [Gitea](../reference/platforms/gitea.md) | Webhook Secret | Select the independent Gitea provider, not GitHub compatibility mode |
| [App Store Connect](../reference/platforms/app-store-connect.md) | Independent Webhook Secret | Not an API private key or in-app purchase/notification secret; IAP/subscription JWS notifications are not supported |
| [GitLab](../reference/platforms/gitlab.md) | Signing Token or legacy Secret Token | Follow your instance's supported mode; do not mix them |
| [Stripe](../reference/platforms/stripe.md) | Endpoint Signing Secret | Do not mix endpoints or test/live environment secrets |
| [Slack](../reference/platforms/slack.md) | App Signing Secret | Not a Bot Token |
| [Feishu](../reference/platforms/feishu.md) | Verification Token, optional Encrypt Key | When encryption is enabled, configure the same Encrypt Key on both sides |
| [Telegram](../reference/platforms/telegram.md) | Webhook Secret Token | Not a Bot Token |
| [Shopify](../reference/platforms/shopify.md) | App Client Secret | Not a store access token |

Keep the original credentials safe. NoMail does not return secret values when reading a configuration. Server-side encryption key configuration belongs to [Installation and deployment](install.md#configure-the-encryption-key).

## If messages do not arrive

- Check that the platform subscription is enabled and includes the relevant event.
- Check that the full receiver URL is publicly reachable and forwarded correctly by the reverse proxy.
- Check that credentials match the current app, endpoint, and environment.
- Review platform delivery results to distinguish URL verification, authentication failures, and event processing issues.

For signatures, headers, and event structures, consult the [platform protocol reference](../reference/webhook-platform-reference-2026-10-30.md). Upstream protocol coverage, including interactive business responses and outbound API calls, is not a promise that NoMail implements every capability.
