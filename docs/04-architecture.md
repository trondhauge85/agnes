# Architecture Notes

Backend:
- Prefer runtime adapters (e.g., Cloudflare Worker, Node HTTP, edge runtimes).
- Keep transport details outside domain logic.

Frontend:
- React app focused on feature-based module structure.
- Share contracts/types from `packages/shared`.
