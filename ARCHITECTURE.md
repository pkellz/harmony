/**

- API & Server Architecture
- 
- Conventions for Next.js API routes.
- Inspired by [Tao of Node](https://alexkondov.com/tao-of-node/) layers, services,
- Zod validation, and thin middleware. Prefer this document over ad-hoc patterns
- when adding or changing server code.
- 
- Cursor agents: also see `.cursor/rules/api-architecture.mdc`.
 */

# Layers

```
Handler (route.ts)  →  Service  →  Repository  →  Mongoose
         ↓                ↓
      Zod parse      domain/* (pure)
         ↓                ↓
      withAuth/       services/* (infra: Stripe, Azure, Email, providers)
      withRoute
```


| Layer                                   | Responsibility                                                                     | May import                                                                                                               | Must not import                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **Handler** (`src/app/api/**/route.ts`) | HTTP only: auth wrappers, Zod parse, call service(s), shape response               | `@/server/http/`*, `@/server/<domain>/*.service`, `@/server/<domain>/*.schemas`                                          | `mongoose`, `@/types/mongoose/*`, `@/services/Database`    |
| **Service** (`*.service.ts`)            | Business orchestration; call repositories and other **services**; throw `AppError` | repositories in same domain, other domains' **services**, `@/domain/`*, `@/services/*` (infra), `@/server/http/appError` | `next/server`, `@/types/mongoose/*`, `@/services/Database` |
| **Repository** (`*.repository.ts`)      | Persistence only: Mongoose / transactions                                          | `mongoose`, `@/types/mongoose/`*, `@/services/Database`, `@/server/db/*`                                                 | `next/server`, other domains' repositories                 |
| **Domain** (`src/domain/`**)            | Pure business rules (no I/O)                                                       | other `src/domain/*`, plain types                                                                                        | `next/*`, `mongoose`, `@/services/*`                       |
| **Infra** (`src/services/`**)           | DB connection, Logger, Cache, Email, Azure, Stripe client, transcription providers | —                                                                                                                        | Prefer not importing route handlers                        |


**Rule of thumb:** add layers as complexity grows. New endpoints always go through at least handler → service; repositories own all Mongoose.

# Folder map

```
src/
  app/api/                 # Thin route handlers only
  server/
    http/                  # Transport primitives (AppError, withRoute, withAuth, validate, responses, requestLog)
    db/                    # withTransaction (repositories only)
    <domain>/
      <domain>.schemas.ts
      <domain>.service.ts
      <domain>.repository.ts
  domain/                  # Pure rules (creditMath, planLimits, exportAccess, …)
  lib/                     # Generic utilities only (cn, emailRegex, formatters)
  services/                # Infra adapters (unchanged role)
  types/mongoose/          # Mongoose schemas (persistence models)
```

Domains: `auth`, `users`, `credits`, `billing`, `transcriptions`, `exports`, `sharing`, `search`, `feedback`, `marketing`.

# Worked example: POST /api/transcriptions

**Before (anti-pattern):** one handler parses Zod, loads the user, checks plan limits, parses audio duration, reserves credits, creates a document, submits to the provider, and rolls back — all inline.

**After:**

```ts
// src/app/api/transcriptions/route.ts
export const POST = withAuth(async (req, authUser) => {
  const body = await parseBody(req, createTranscriptionSchema);
  const result = await transcriptionsService.create(authUser.userId, body);
  return ok({ id: result.id });
});
```

```ts
// transcriptions.service.ts — orchestration only
export async function create(userId: string, input: CreateInput) {
  const user = await usersService.getByIdOrThrow(userId);
  // plan limits from domain/, credits via creditsService, persistence via repository
  …
}
```

Cross-module calls go **service → service**, never service → foreign repository.

# Validation (Zod)

- Schemas live in `src/server/<domain>/<domain>.schemas.ts`.
- Validate at the **top of the handler** with `parseBody` / `parseQuery` / `parseParams` (not Express-style middleware).
- Failed validation → `AppError(400, "Invalid body", { details })` → `{ error: "Invalid body", details, code: "VALIDATION_ERROR" }`.



# Middleware / wrappers

Wrappers (`withAuth`, `withSubscription`, ownership helpers) decide **continue or stop** only. They must not contain business logic or query Mongoose. Delegate to a service (`usersService.hasActiveSubscription`, `transcriptionsService.assertOwnedBy`).

## Request logging

`withRoute` / `withAuth` / `withSubscription` all run through `runWithRequestLog` (`src/server/http/requestLog.ts`), so every endpoint logs without per-handler code:

- `api.request` — method, path, query, route params, redacted JSON body, ip, user agent, and `userId`/`role` once authenticated.
- `api.rejected` — requests stopped by the auth wrappers before the handler ran.
- `api.response` — status and `durationMs`; level follows the status (`info` / `warn` / `error`).

Keys matching password / token / secret / api key / authorization / cookie / signature are replaced with `[redacted]`, emails are masked, and bodies are only buffered for `application/json` under 4 KB. Every request gets a `requestId` (reusing an inbound `x-request-id`) that is echoed on the response header and available anywhere downstream via `getRequestContext()` — include it when logging from services.

# Errors & wire contract

- Throw `AppError(statusCode, message, { code?, details?, metadata? })` from services (and rarely handlers).
- `withRoute` / `withAuth` map errors to JSON.
- **Client-compatible body:** always `{ error: string }` plus optional `code`, `details`, and other flat fields (`creditsNeeded`, etc.). Do **not** nest as `{ error: { message } }`.
- Success shapes stay as today (`{ id }`, `{ ok: true }`, paginated `{ items, page, … }`).



# Where new code goes


| You are…                                          | Put it in…                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| Adding an HTTP endpoint                           | Thin `route.ts` + service method (+ schema if body/query)                    |
| Adding a business rule with no I/O                | `src/domain/<area>/`                                                         |
| Adding a DB query / mutation                      | Same-domain `*.repository.ts`                                                |
| Calling Stripe / Azure / Email / Redis / a worker | Existing or new module under `src/services/` (infra), invoked from a service |
| Sharing logic across domains                      | Owning domain's **service**; callers import that service                     |




# ESLint guardrails

`eslint.config.mjs` restricts imports by folder (warnings during migration, errors when complete):

- `src/app/api/**` — no `mongoose`, `@/types/mongoose/*`, `@/services/Database`
- `src/server/**/*.service.ts` — no `next/server`, `@/types/mongoose/*`, `@/services/Database`
- `src/server/**/*.repository.ts` — no `next/server`
- `src/domain/**` — no `next/*`, `mongoose`, `@/services/*`



# Auth

Prefer `withAuth` from `@/server/http/withAuth` for protected routes. It uses blacklist-aware `authenticateRequest`. Do not verify JWTs ad hoc in handlers (that historically skipped blacklist checks).

# Related docs

- [FRONTEND.md](./FRONTEND.md) — React / Next.js UI conventions
- [README.md](./README.md) — product/stack overview and local setup
- [Tao of Node](https://alexkondov.com/tao-of-node/) — design rationale

