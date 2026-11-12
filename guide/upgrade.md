---
title: Upgrade NoMail to the latest stable release
description: Check version compatibility, back up data, prepare the incompatible message-storage migration, and plan rollback before upgrading NoMail.
---

# Upgrade NoMail

This page owns version-specific upgrade prerequisites. For fresh installations, use [Installation and deployment](install.md). For runtime-specific backup and replacement commands, return to your deployment page after completing the prerequisites below.

The target is the [latest stable release](https://github.com/neighbour-dev/nomail-api/releases/latest), not `main` or its Unreleased notes. Read the target release notes first and apply only the migration conditions crossed by your upgrade. Version numbers below identify historical breaking changes, not a pinned installation target.

## Check your starting version

| Starting point | Path |
|---|---|
| Fresh instance | Follow the deployment guide; no historical data needs migration |
| v0.2.0 or v0.3.0 | Complete the message-storage migration prerequisites below |
| v0.1.0 or older schema | No supported in-place conversion to the v0.2.0 configuration schema; back up, use a new database, and recreate configurations. Old accounts and messages are not imported automatically |
| v0.4.0 or later | Do not clear messages again for the v0.4.0 migration; check the target release notes for any later prerequisites |

## Crossing v0.4.0: message-storage migration

This section applies only when upgrading from a version before v0.4.0 to v0.4.0 or later.

**Historical messages are incompatible. There is no conversion or compatible historical read. If you need to keep them accessible in NoMail, do not proceed with this upgrade path.**

1. Stop the old instance and block incoming writes. For Workers, block requests for the entire migration and deployment window.
2. Back up the database and configuration using your deployment page's procedure. Securely preserve the original `JWT_SECRET`, `JWT_ISSUER`, and `SECRET_ENCRYPTION_KEY`.
3. Only after confirming the backup and accepting message loss, physically clear `notify_messages`, including soft-deleted rows, using your database administration tool. Deleting messages in the App is not enough. There is no need to clear accounts, devices, or receiver configurations.
4. Continue with your deployment page: Server applies pending migrations at startup; Workers requires applying `0003_raw_storage.sql` before switching to the new code. The third migration adds `raw_headers` and removes `platform_data`. **A nonempty message table makes the migration fail; the application never clears it automatically.**
5. Verify health, login, and a new test delivery before reopening traffic.

## Check client compatibility

Clients must support the target release's raw and platform-data contract, including nullable `platformData` and native payload paths. Check the [latest OpenAPI attachment](https://github.com/neighbour-dev/nomail-api/releases/latest/download/swagger.json). A client that can log in is not necessarily compatible with message details.

If upgrading from v0.2.0, also check the SSE compatibility changes. For full changes and any later prerequisites, see the [latest stable release notes](https://github.com/neighbour-dev/nomail-api/releases/latest).

## Rollback

The migrated database cannot be handed back to the old program. Restore the pre-upgrade database, configuration, and old program together. Server and Workers database files are not interchangeable.

## Continue with your deployment

- [Docker Compose](install/docker.md#backups-and-upgrades)
- [Release binaries](install/binary.md#backups-and-upgrades)
- [Build from source](install/source.md#backups-and-upgrades)
- [Cloudflare Workers](install/workers.md#backups-and-upgrades)
