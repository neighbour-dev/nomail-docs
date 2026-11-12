---
title: Deploy NoMail with Docker Compose
description: Deploy NoMail using Docker Compose and the official GHCR image, configure keys and accounts, check health, and manage SQLite volumes, upgrades, backups, and recovery.
---

# Deploy NoMail with Docker Compose

Requires Docker Engine and Compose v2. No Rust installation or separate database is needed. The official GHCR image stores SQLite data in a persistent volume.

## 1. Get the deployment files

Read the tag on the [latest stable release](https://github.com/neighbour-dev/nomail-api/releases/latest) and replace `vX.Y.Z` below with it:

```bash
RELEASE_TAG=vX.Y.Z
git clone --branch "$RELEASE_TAG" --depth 1 https://github.com/neighbour-dev/nomail-api.git
cd nomail-api
```

Run the following commands from the repository root. By default, `compose.yml` uses the latest stable image:

```yaml
image: ghcr.io/neighbour-dev/nomail-api:latest
```

## 2. Prepare configuration

Follow the [common configuration instructions](../install.md#prepare-keys-and-the-initial-account) to prepare independent keys and initial account credentials.

Create the configuration for a first installation only; do not overwrite an existing `.env`:

```bash
cp .env.example .env
```

Edit `.env`, fill in the keys and initial account credentials, and keep or adjust:

```dotenv
JWT_ISSUER=nomail-api
PORT=3000
RUST_LOG=info
```

## 3. Start and check

```bash
docker compose pull
docker compose up -d
docker compose logs --tail=100 nomail-api
curl http://127.0.0.1:3000/api/health
```

Both `data.status` and `data.db` should be `ok`. Adjust the URL if you change `PORT`. The health endpoint has no application-level rate limit; configure one at your reverse proxy or CDN if needed.

Compose stores the database at `/data/nomail.db` in the `nomail-data` volume, overriding `.env`'s `DATABASE_PATH`. The container root filesystem is read-only; database and WAL/SHM files are written to the data volume. Do not use `docker compose down -v` unless you intend to delete all data.

After logging in and changing the initial password, remove `INITIAL_PASSWORD` from `.env` and run `docker compose up -d` again. Run this command after later `.env` changes to apply the updated environment.

Follow the [common post-deployment configuration](../install.md#common-post-deployment-configuration) to enable public access and connect sources.

## Optional: build a local image

To deploy local modifications, build from the repository root:

```bash
docker build -t nomail-api:local .
```

Change `compose.yml`'s `image` to:

```yaml
image: nomail-api:local
```

Create and fill in `.env` as above, then start without running `docker compose pull`:

```bash
docker compose up -d --pull never
```

## Backups and upgrades

Release images support `linux/amd64` and `linux/arm64`; Docker selects the correct architecture automatically. `latest` follows stable releases, not prereleases. Pin an explicit stable version tag (such as `vX.Y.Z`) for production.

1. Complete the prerequisites in [Upgrading](../upgrade.md) before replacing the image. Preserve configuration and the original encryption key.
2. Stop the service and back up the entire data volume, or use SQLite's online backup tools. In WAL mode, do not copy only the main database file while running.
3. Set the target image version in `compose.yml`, then run `docker compose pull` and `docker compose up -d`. For a local image, rebuild and start with `--pull never`.

The server applies pending database migrations at startup. Never delete the data volume to upgrade.

## Forgotten password

```bash
docker compose exec nomail-api reset-account --username admin --password '<new-password>'
```

Omit `--username` to retain the current username. Resetting revokes all sessions. Passwords are passed as command-line arguments: use a trusted terminal and consider shell history and process argument visibility.
