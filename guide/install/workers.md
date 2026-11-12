---
title: Deploy NoMail on Cloudflare Workers
description: Deploy NoMail with Workers, D1, and Durable Objects, install build tools, configure remote secrets and an initial account, test locally, and back up and upgrade your deployment.
---

# Deploy NoMail on Cloudflare Workers

Requires Rust 1.99+, Node.js 22+, and a Cloudflare account. Workers uses D1 and Durable Objects. bcrypt and persistent SSE incur CPU, connection, and financial costs: check your plan's actual limits before deployment. Free-plan suitability is not guaranteed.

## 1. Get the source and install tools

Read the tag on the [latest stable release](https://github.com/neighbour-dev/nomail-api/releases/latest) and replace `vX.Y.Z` below with it:

```bash
RELEASE_TAG=vX.Y.Z
git clone --branch "$RELEASE_TAG" --depth 1 https://github.com/neighbour-dev/nomail-api.git
cd nomail-api
rustup target add wasm32-unknown-unknown
cargo install worker-build --locked --version 0.8.7
cd crates/nomail-workers
npm ci
```

Ensure `worker-build` is on `PATH`. Run the following commands from `crates/nomail-workers`.

## 2. Create resources

```bash
npx wrangler login
npx wrangler d1 create nomail
```

Write the returned `database_id` into `wrangler.toml`. The all-zero ID is for local development only. If you change the database name, update `database_name` too. Change the Worker's `name` if needed, but keep the binding names `DB` and `REALTIME` used by the code.

## 3. Configure remote secrets and the initial account

Prepare independent keys and initial account credentials following the [common configuration instructions](../install.md#prepare-keys-and-the-initial-account). Run each command and enter the real value when prompted:

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put SECRET_ENCRYPTION_KEY
npx wrangler secret put INITIAL_USERNAME
npx wrangler secret put INITIAL_PASSWORD
```

`JWT_ISSUER` is in `[vars]` in `wrangler.toml`. Local `.env` or `.dev.vars` files do not replace remote Secrets.

## 4. Initialize and deploy

Confirm the target database, then run:

```bash
npx wrangler d1 migrations apply DB --remote
npm run deploy
```

Wrangler runs `worker-build --release` and deploys the `Realtime` Durable Object. Check `/api/health` at the deployment URL. Both `data.status` and `data.db` should be `ok`.

Log in and change the initial password, then remove the remote initial password:

```bash
npx wrangler secret delete INITIAL_PASSWORD
```

Follow the [common post-deployment configuration](../install.md#common-post-deployment-configuration) to connect the NoMail App and notification sources.

## Optional: test locally

Local testing does not connect to the remote database. Create configuration on first use only; do not overwrite an existing `.dev.vars`:

```bash
cp .dev.vars.example .dev.vars
```

Fill in keys and initial account credentials in `.dev.vars`, then run:

```bash
npx wrangler d1 migrations apply DB --local
npm run dev
```

Use the local URL printed by Wrangler. Never commit `.dev.vars` or local databases. Local changes do not update the remote deployment.

## Backups and upgrades

1. Complete the prerequisites in [Upgrading](../upgrade.md) before applying migrations. Back up keys securely; do not regenerate them for upgrades.
2. Use Cloudflare's D1 export or recovery facilities and verify the recovery procedure.
3. Get the target source version, preserving resource bindings and configuration. Rerun `npm ci` if dependencies change.
4. In `crates/nomail-workers`, confirm the target database, run `npx wrangler d1 migrations apply DB --remote`, then `npm run deploy`.

Do not resume incoming requests until both migrations and deployment are complete.

## Account recovery limitations

Workers has neither Server's local account reset tool nor a public password recovery endpoint. Keep your account credentials and backups safe.
