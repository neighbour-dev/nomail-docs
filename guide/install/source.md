---
title: Build and deploy NoMail from source
description: Build NoMail Server with Rust, generate encryption keys, configure an initial account, and manage SQLite storage, services, backups, upgrades, and account resets.
---

# Build and deploy NoMail from source

Requires Rust 1.99+ and platform build tools. Suitable for modifying the backend or building it yourself. Uses local SQLite without a separate database service.

## 1. Get the source

```bash
git clone https://github.com/neighbour-dev/nomail-api.git
cd nomail-api
```

Run the following commands from the repository root.

## 2. Prepare configuration

For a first installation, create configuration and generate the credential encryption key. Do not overwrite an existing `.env` or regenerate an existing deployment's encryption key:

```bash
cp .env.example .env
cargo run --locked -p nomail-server --bin gen-secret-key
```

The generator prints a complete `SECRET_ENCRYPTION_KEY=...` line. Follow the [common configuration instructions](../install.md#prepare-keys-and-the-initial-account) for the remaining keys and initial account. Generate `JWT_SECRET` independently.

## 3. Build and start

```bash
cargo build --locked --release -p nomail-server --bins
./target/release/nomail-api
```

The default listener is `0.0.0.0:3000`, with the database at `./data/nomail.db`. Directories, database, and tables are created automatically. Server uses SQLite WAL and foreign key constraints, does not require PostgreSQL, and provides no migration from legacy PostgreSQL data.

Check from another terminal:

```bash
curl http://127.0.0.1:3000/api/health
```

Both `data.status` and `data.db` should be `ok`. Adjust the URL if you change the port.

`.env` is loaded from the process's working directory. In production, configure a working directory, environment variables, and automatic restart through a service manager.

The initial account is created at first startup. Log in and change its password, then remove `INITIAL_PASSWORD` and restart. Follow the [common post-deployment configuration](../install.md#common-post-deployment-configuration) for public access and sources.

## Backups and upgrades

1. Review the [common backup and upgrade requirements](../install.md#common-backup-and-upgrade-requirements). Preserve configuration and the original encryption key.
2. Stop the service and back up the entire data directory, or use SQLite's online backup tools. In WAL mode, do not copy only the main database file while running.
3. Get the target version's source, keep the existing `.env` and data directory, rebuild, and restart.
4. Check health and logs. Server applies pending database migrations at startup.

## Forgotten password

Use the same working directory, database path, and configuration as the running service:

```bash
./target/release/reset-account --username admin --password '<new-password>'
```

Omit `--username` to retain the current username. Resetting revokes all sessions. Passwords are command-line arguments: use a trusted terminal and consider shell history and process argument visibility.
