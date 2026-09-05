/**
 *
 * Frontend Architecture
 *
 * Conventions for Next.js App Router pages, React components, hooks, and client
 * data fetching. Inspired by [Tao of React](https://alexkondov.com/tao-of-react/).
 * Prefer this document over ad-hoc patterns when adding or changing UI code.
 *
 * Cursor agents: also see `.cursor/rules/frontend-architecture.mdc`.
 * Server / API routes: see [ARCHITECTURE.md](./ARCHITECTURE.md).
 */

# Layers

```
page.tsx (thin shell)
    → Feature component (local UI state)
        → List / ListItem (presentational)
        → Feature hook (src/hooks) — fetch + loading + error
            → apiClient (src/lib) — Bearer, ApiError, JSON
                → /api/* (server layers)
```

| Layer | Responsibility | May import | Must not |
| --- | --- | --- | --- |
| **Route** (`src/app/**/page.tsx`) | Compose layouts and feature components; App Router defaults | feature components, providers | Direct `fetch`, business branching |
| **Feature component** | Local UI state, event handlers, call hooks | hooks, presentational children, `@/lib/*` utils | Raw `fetch`, `@/server/*`, `@/types/mongoose/*` |
| **Presentational** | Props in, markup out | UI primitives (`@/components/ui/*`) | Hooks that fetch, auth side effects |
| **Hook** (`src/hooks/**`) | Data fetching, async actions, derived state | `apiClient`, `useAuth`, domain helpers | JSX / React elements |
| **apiClient** (`src/lib/apiClient.ts`) | Attach Bearer, parse JSON, throw `ApiError` | — | React |

**Rule of thumb:** components never call `fetch` directly; hooks never render; pass domain objects as props instead of many primitives.

# Component conventions

## Declaration style

- Prefer **named function declarations**: `export function Foo() { … }`.
- Use `export default function Page()` only for App Router `page.tsx` / `layout.tsx` where Next expects a default export.
- Declare props as `type FooProps = { … }` directly above the component.
- Always name components (no anonymous `export default () => …`). The one exception is `ErrorBoundary` (class component — React has no hook equivalent).

## Helpers

- Pure helpers that do not close over state/props live **above** the component, at module scope.
- Pass values as arguments; do not read state from inside a nested helper.
- JSX-returning helpers become **named components**, never `const body = <div/>` or `function renderHeader()` inside the parent.

## Markup & lists

- Drive repetitive nav links, filters, badges, share tiles, etc. from a **module-scope config array** + `.map()`.
- Extract `.map()` loops into a dedicated list component when the parent has other responsibilities.
- Soft size target: ~150 lines. Extract when a block loops or branches heavily.
- Prefer at most ~5 props; pass an object (`transcription`, `newsletter`) instead of many related primitives.
- Destructure props in the signature with **defaults inline** (`{ title = "" }`), not `Component.defaultProps` or scattered `??` in the body.
- Prefer ternaries over `&&` for conditional rendering (avoids rendering `0`). Nested ternaries → small component with early returns.

## Styling & UI kits

- App UI uses Tailwind + shadcn under `src/components/ui/` (do not hand-edit generated primitives unless necessary).
- Vendored Once UI lives in `src/once-ui/` — treat as external; do not apply these conventions there.

# Data fetching

```ts
import { apiFetch, ApiError } from "@/lib/apiClient";
import { useAsyncAction } from "@/hooks/useAsyncAction";
```

1. All client `/api/*` calls go through `apiFetch` (Bearer token, JSON parse, `ApiError`).
2. Wrap mutations with `useAsyncAction` for pending/error instead of hand-rolled `setLoading` / try/catch in every component.
3. Feature-specific fetch + poll logic lives in `src/hooks/use*.ts` (e.g. `useTranscriptionList`).
4. Toast library: **sonner** only. Do not import `react-toastify`.

Wire errors match the server contract: `{ error: string }` plus optional flat fields (`code`, `details`, …). `ApiError.message` is that string.

# Auth on the client

- Read session via `useAuth()` from `@/contexts/AuthContext`.
- Pass `accessToken` into `apiFetch` options; do not read `localStorage` for the token at call sites.
- Auth mutations that update the session (login, logout, email change) belong on the auth context / auth helpers — not ad-hoc `fetch` in settings forms that bypass context.

# Error boundaries

- Use `ErrorBoundary` around independently failing regions (list, player, settings card).
- Prefer App Router `error.tsx` / `loading.tsx` for route-level failures and pending states.

# Folder map (light grouping)

```
src/
  app/                     # Routes: thin page shells + layouts
  components/
    ui/                    # shadcn (generated) — leave alone
    transcription/         # Feature-grouped pieces
    navbar/
    …
  contexts/                # AuthProvider, etc.
  hooks/                   # useAsyncAction, useTranscription*, …
  lib/
    apiClient.ts           # Shared fetch + ApiError
  once-ui/                 # Vendored — out of scope
```

Do not introduce a full `src/modules/` tree unless the app outgrows feature folders under `components/`.

# Where new code goes

| You are… | Put it in… |
| --- | --- |
| Adding a page | Thin `page.tsx` that composes feature components |
| Adding UI for a feature | `src/components/<feature>/` (named `export function`) |
| Fetching or mutating `/api/*` | Hook in `src/hooks/` using `apiFetch` |
| Pure formatting / validation shared by UI | `src/lib/` or a zod schema next to the form |
| Cross-cutting auth session | `AuthContext` / auth helpers |

# ESLint guardrails

`eslint.config.mjs` applies to `src/components/**`, `src/app/**` (excl. `api/`), `src/contexts/**`, and `src/hooks/**`, excluding `ui/` and `once-ui/`:

- **Errors:** no `react-toastify`, `mongoose`, `@/types/mongoose/*`, `@/server/*`; no `defaultProps`; `react/display-name`; `react/no-unstable-nested-components`
- **Warnings (incremental):** `react/destructuring-assignment`, `react/jsx-no-leaked-render`

# Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — API / server layers
- [README.md](./README.md) — product/stack overview
- [Tao of React](https://alexkondov.com/tao-of-react/) — design rationale
