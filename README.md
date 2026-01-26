# Agnes Monorepo

This repository is the monorepo foundation for an AI assistant platform spanning backend, frontend, shared packages, and infrastructure.

## Quick Start
- Review the docs in `docs/` for architecture and workflow guidance.
- The monorepo uses pnpm workspaces for package management.

## Structure
- `apps/backend`: server runtime adapters and API surface.
- `apps/frontend`: React UI shell.
- `packages/shared`: shared TypeScript contracts and utilities.
- `infra/terraform`: infrastructure-as-code.

Each directory contains a small `README.md` for LLM-friendly context.

## Environment variables

Local development uses a `.env` file for runtime configuration. Copy the
template, fill in any required secrets, and keep the file out of version
control:

```bash
cp .env.example .env
```

The Node.js backend runtime loads `.env` automatically when you run
`pnpm --filter @agnes/backend dev`. Worker deployments still rely on
`wrangler.toml` or environment bindings instead of `.env`.
