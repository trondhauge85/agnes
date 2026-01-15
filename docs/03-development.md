# Development Workflow

- Use pnpm workspaces for dependency management.
- Add linting/formatting tools in the root `package.json` once standards are chosen.
- Each app/package maintains its own `tsconfig.json` extending `tsconfig.base.json`.
