---
title: NoMail - Self-hosted notification inbox and platform integration guides
description: Bring events and notifications from different platforms into the NoMail App, with data stored on your own server. Explore deployment, Webhook integrations, and platform protocols.
layout: home

hero:
  name: NoMail
  text: Your self-hosted notification inbox
  tagline: View notifications from different platforms in the NoMail App, and keep your inbox data on your own server.
  actions:
    - theme: brand
      text: Get started
      link: /guide/
    - theme: alt
      text: Deploy your server
      link: /guide/install

features:
  - title: One notification inbox
    details: View and manage messages from different platforms in the NoMail App.
    link: /guide/introduction
  - title: Your data, your control
    details: Deploy on your own server or Cloudflare Workers to store notifications and event context.
    link: /guide/install
  - title: Connect notification sources
    details: Learn what each platform requires and how to deliver platform events to NoMail.
    link: /guide/sources
---

## Bring platform events into one inbox

NoMail consists of an App and a self-hostable backend. The backend receives Webhooks, verifies their source, and stores events. Use the App to view and manage the resulting messages in one place.

It is designed for collecting development events, build results, and service notifications while keeping control of your inbox data.

## From deployment to receiving notifications

1. [Learn about NoMail](guide/introduction.md) and the roles of the App, backend, and source platforms.
2. [Deploy your server](guide/install.md) using Docker, a binary, source code, or Cloudflare Workers.
3. [Connect notification sources](guide/sources.md): prepare receiver URLs and credentials, configure subscriptions, and verify delivery.

## Integrations and protocol reference

- Start with the [user guide](guide/index.md) to prepare your server and credentials.
- Use the [platform protocol reference](reference/index.md) to troubleshoot authentication and delivery.
- Find signature, payload, and callback response requirements in the [Webhook protocol index](reference/webhook-platform-reference-2026-10-30.md).
