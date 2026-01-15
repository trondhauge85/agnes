# Backend

Purpose: portable server runtime that can be deployed on Workers, VMs, or k8s.

## Architecture

The backend is split by responsibility so new features are easy to extend:

- `src/index.ts`: exports the request handler for the platform runtime.
- `src/router.ts`: URL/method routing and handoff to handlers.
- `src/handlers/`: route handlers grouped by domain (auth, families, root).
- `src/data/`: in-memory stores and domain-specific helpers (e.g., families).
- `src/utils/`: cross-cutting helpers for HTTP and string normalization.
- `src/types.ts`: shared domain types and payload definitions.

## Extension guidelines

- Add new endpoints by creating a handler in `src/handlers/` and wiring it in
  `src/router.ts`.
- Keep request parsing and validation in the handler; keep pure utilities in
  `src/utils/` so they stay reusable.
- If you add new data stores or persistence adapters, place them in `src/data/`
  and keep the handler APIs stable.
- Update `src/types.ts` when adding new payloads or response shapes.

## Next steps

- Add routing, adapters, and configuration.
- Introduce runtime-specific adapters (Cloudflare, Node, edge).
