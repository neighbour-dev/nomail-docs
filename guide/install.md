---
title: NoMail server installation and deployment guide
description: Choose Docker Compose, release binaries, source builds, or Cloudflare Workers, understand storage and environment requirements, and prepare keys and an initial account.
---

# Install and deploy the NoMail server

This page covers deployment choices and shared server configuration for the [latest stable release](https://github.com/neighbour-dev/nomail-api/releases/latest), not the unreleased `main` branch. See [About NoMail](introduction.md) for product roles and [Upgrading](upgrade.md) for existing installations.

## Choose a deployment method

Choose one method. Each page covers installation, startup, upgrades, and account recovery:

| Method | Requirements | Storage |
|---|---|---|
| [Docker Compose](install/docker.md) | Docker Engine, Compose v2 | SQLite in a persistent volume |
| [Release binaries](install/binary.md) | Linux amd64 or arm64, glibc 2.39+ (such as Ubuntu 24.04) | Local SQLite file |
| [Build from source](install/source.md) | Rust 1.99+, system build tools | Local SQLite file |
| [Cloudflare Workers](install/workers.md) | Rust 1.99+, Node.js 22+, Cloudflare account | D1, Durable Objects |

Docker Compose and binary deployments do not require Rust. See the Workers page for build tools, resource creation, and deployment steps.

## Prepare keys and the initial account

These settings apply to all deployment methods. Store them in `.env`, `.dev.vars`, or Workers Secrets as described on the relevant page.

**Do not use passwords or keys from example files.** Copy example configurations only for a first installation. Never overwrite an existing configuration; back it up before upgrading, and do not regenerate the encryption key of an existing deployment.

| Setting | Purpose and requirements |
|---|---|
| `JWT_SECRET` | Token signing key; use a separate, strong random value |
| `JWT_ISSUER` | Token issuer; defaults to `nomail-api` |
| `SECRET_ENCRYPTION_KEY` | Encrypts receiver credentials; 32 random bytes encoded as Base64 |
| `INITIAL_USERNAME` | Initial username; 1–64 characters, used only when the account table is empty |
| `INITIAL_PASSWORD` | Initial password; at least 8 characters including ASCII letters and digits, at most 72 UTF-8 bytes |

### Configure the encryption key

`SECRET_ENCRYPTION_KEY` encrypts and decrypts sensitive platform credentials stored by the server, such as Webhook secrets. It is separate from each platform's receiver secret. It must be 32 random bytes encoded as Base64 for AES-256-GCM, not a password or arbitrary string.

With OpenSSL installed, run these commands separately. Use the first output for `JWT_SECRET` and the second for `SECRET_ENCRYPTION_KEY`:

```bash
openssl rand -hex 32
openssl rand -base64 32
```

Generate the JWT key and credential encryption key independently. Never commit real keys to Git or put them in example files. Binary and source deployments can also use the `gen-secret-key` tool described on their pages.

**Back up the encryption key securely and keep it unchanged for an existing deployment. Losing or replacing it makes previously encrypted platform credentials unreadable. Database recovery also requires the original key.**

### Initial account

Set `INITIAL_USERNAME` and `INITIAL_PASSWORD` before first use. Docker, binary, and source deployments initialize the account at startup; Workers initializes it at first login. **Log in and change the initial password before removing `INITIAL_PASSWORD` as described on your deployment page.** Changing these settings never overwrites an existing account.

For HTTP contracts, use the [latest OpenAPI attachment](https://github.com/neighbour-dev/nomail-api/releases/latest/download/swagger.json).

## Common post-deployment configuration

- Save the server URL and account for connecting the NoMail App. Password changes sign out all sessions, requiring a new login.
- Next, follow [Connect notification sources](sources.md).
- Use HTTPS for public deployments, with rate limiting and abuse protection at your reverse proxy or Cloudflare.
- Set and sanitize forwarded client IP headers correctly behind a reverse proxy. Device IPs are for display only, not access control.
- Disable response buffering for SSE and set a read timeout longer than its 20-second heartbeat interval.

## Common backup and upgrade requirements

- Securely preserve `JWT_SECRET`, `JWT_ISSUER`, and `SECRET_ENCRYPTION_KEY` across upgrades.
- Before replacing code or applying migrations, read [Upgrading](upgrade.md). It is the single place for version-specific prerequisites and compatibility warnings.
- Server and Workers use different database encodings. SQLite and D1 database files cannot be exchanged directly.
- See each deployment page for database backups, upgrade commands, and account recovery limitations.
