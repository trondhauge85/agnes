# Frontend

Purpose: React UI for the assistant experience.

## Architecture

- **Tooling:** Vite SPA + React + TypeScript.
- **UI system:** Material UI with `styled-components` styling engine.
- **Routing:** React Router with loaders.
- **Feature organization:** `src/features/<feature>`.
- **Shared API:** `src/shared/api` for OpenAPI-generated clients and shared helpers.

## Key files

- `index.html`: Vite entry HTML.
- `src/main.tsx`: React entry point.
- `src/app/App.tsx`: App providers and router.
- `src/app/router.tsx`: Route definitions + loaders.
- `src/features/auth`: Login screen and session helpers.

## Local development

```bash
pnpm --filter @agnes/frontend dev
```
