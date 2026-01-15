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

## Calendar endpoints

The calendar routes provide a provider-agnostic REST surface while using Google
Calendar as the initial backing store. The backend now uses the official
Google Calendar API to list calendars and manage events once a connection is
established.

- `GET /calendar/providers`: list supported providers.
- `POST /calendar/setup`: exchange a Google OIDC authorization code for a
  connection and store refresh/access tokens in memory.
- `GET /calendar`: list calendars for a provider.
- `POST /calendar/select`: create or select a calendar as the active one.
- `GET /calendar/events`: list events with filters (date range, participant,
  status, tags, search, limit).
- `POST /calendar/events`: create an event in the selected calendar.
- `PATCH /calendar/events/:id`: update an event.
- `DELETE /calendar/events/:id`: delete an event.

## Family todo endpoints

- `GET /families/:id/todos`: list shared todos for a family.
- `POST /families/:id/todos`: create a shared todo (optionally assign to a member).
- `PATCH /families/:id/todos/:todoId`: update a shared todo (status, title, notes, assignment).
- `DELETE /families/:id/todos/:todoId`: remove a shared todo.

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

## Google Calendar configuration

Provide the following environment variables to enable the integration:

- `GOOGLE_CLIENT_ID`: OAuth 2.0 client ID.
- `GOOGLE_CLIENT_SECRET`: OAuth 2.0 client secret.

The client must be configured in Google Cloud Console with the redirect URI you
pass to `POST /calendar/setup` so the authorization code exchange succeeds.
