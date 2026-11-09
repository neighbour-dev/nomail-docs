---
title: About NoMail - App and self-hosted notification inbox
description: Understand the NoMail App, self-hostable backend, and source platforms, how events reach your inbox, and how online updates differ from mobile system push notifications.
---

# About the NoMail notification inbox

NoMail collects events and notifications from different platforms so you can view and manage them together in the NoMail App.

## App and backend

- **NoMail App**: your everyday interface for viewing and managing messages.
- **NoMail backend**: receives platform Webhooks, verifies their source, and stores messages and event context. Deploy it on your own server or Cloudflare Workers.

Notifications flow from **source platform → your NoMail server → NoMail App**.

## Where to start

1. [Deploy your server](install.md) and prepare its URL, account, and keys.
2. [Connect notification sources](sources.md) and configure event delivery for the platforms you follow.
3. View and manage incoming notifications in the NoMail App.

The backend's online message updates are not mobile system push notifications. Online updates do not imply that the App receives system notifications while offline.
