---
title: Deploy NoMail using release binaries
description: Deploy NoMail on Linux amd64 or arm64 using verified release binaries, configure accounts and encryption keys, and back up, upgrade, or recover your SQLite-based server.
---

# Deploy NoMail using release binaries

For Linux environments without Docker or Rust. Requires amd64 or arm64 and glibc 2.39+ (such as Ubuntu 24.04); not suitable for Alpine's default musl environment. Current functionality does not require additional CA certificates or timezone data.

## 1. Download and extract

Download `nomail-api-<version>-linux-amd64.tar.gz` or `nomail-api-<version>-linux-arm64.tar.gz` and `SHA256SUMS` from the [latest stable release](https://github.com/neighbour-dev/nomail-api/releases/latest) into the same directory. Cloning the source repository is unnecessary.

For amd64, replace `vX.Y.Z` with the downloaded version:

```bash
sha256sum --ignore-missing -c SHA256SUMS
mkdir -p nomail-server
tar -xzf nomail-api-vX.Y.Z-linux-amd64.tar.gz -C nomail-server
cd nomail-server
```

The archive includes `nomail-api`, `gen-secret-key`, `reset-account`, an example configuration, and the license.

## 2. Prepare configuration

Create configuration only for a first installation; do not overwrite an existing `.env`:

```bash
cp .env.example .env
```

Fill in keys and initial account credentials following the [common configuration instructions](../install.md#prepare-keys-and-the-initial-account). You can also generate the credential encryption key with:

```bash
./gen-secret-key
```

The generator prints a complete `SECRET_ENCRYPTION_KEY=...` configuration line. Generate `JWT_SECRET` independently.

## 3. Start and check

Run from the extracted directory:

```bash
./nomail-api
```

The default listener is `0.0.0.0:3000`, with the database at `./data/nomail.db`. Directories, database, and tables are created automatically. SQLite uses WAL and foreign key constraints; no separate database service is needed.

Check from another terminal:

```bash
curl http://127.0.0.1:3000/api/health
```

Both `data.status` and `data.db` should be `ok`. Adjust the URL if you change the port.

`.env` is loaded from the process's working directory. In production, configure a working directory, environment variables, and automatic restart through a service manager.

After logging in and changing the initial password, remove `INITIAL_PASSWORD` and restart. Follow the [common post-deployment configuration](../install.md#common-post-deployment-configuration) for public access and sources.

## Backups and upgrades

1. Complete the prerequisites in [Upgrading](../upgrade.md) before replacing the programs. Securely preserve `.env` and the original encryption key.
2. Stop the service and back up the entire data directory, or use SQLite's online backup tools. In WAL mode, do not copy only the main database file while running.
3. Download and verify the target version. Replace program files but preserve configuration and data; do not overwrite `.env` with an example file.
4. Restart through your service manager and check health and logs. Pending database migrations run at startup.

Server does not require PostgreSQL and provides no migration from legacy PostgreSQL data.

## Forgotten password

Use the same working directory, database path, and configuration as the running service:

```bash
./reset-account --username admin --password '<new-password>'
```

Omit `--username` to retain the current username. Resetting revokes all sessions. Passwords are command-line arguments: use a trusted terminal and consider shell history and process argument visibility.
