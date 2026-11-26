---
name: safe-ui-overhaul-guardrails
description: Guardrails for redesigning an existing app's frontend WITHOUT breaking backend integrations. Use before and during any UI refactor, reskin, or redesign. Enforces auditing and preserving all API clients, data hooks, auth, state, forms, and business logic. Triggers on "redesign", "reskin", "refactor UI", "overhaul", "rebuild frontend".
---

# Safe UI Overhaul Guardrails

The job is a **skin swap**. Markup, styling and motion change. Logic, data and contracts do not.

## Rule 0: Audit before you touch anything
Do not edit a single component until the **API & Logic Preservation Map** exists and the user has seen it. Inspect, in this order:
1. `package.json`, lockfile, framework (Next.js App Router/Pages, Vite, CRA), TypeScript config, path aliases, env usage
2. API layer: fetch/axios wrappers, interceptors, base URLs, route handlers (`app/api/**`, `pages/api/**`), server actions
3. Data hooks: React Query / SWR / RTK Query / custom `use*` hooks, query keys, mutation functions, cache invalidation
4. Realtime: WebSocket, SSE, Supabase/Firebase listeners
5. Auth: providers, contexts, middleware, protected-route logic, session/token handling
6. State: Redux/Zustand/Context stores, reducers, selectors, URL-state, form libraries (react-hook-form, Formik, zod schemas)
7. Every interactive element: each `onClick`, `onSubmit`, `onChange`, `onKeyDown`, and what function or state it calls
8. Routing: every route, layout, guard, redirect, dynamic segment, and the data each page needs

## The Preservation Map (artifact, required)
A table with one row per integration:

| Area | File | Symbol | Contract (inputs, outputs) | Consumed by (components) | Status |
|---|---|---|---|---|---|

Mark every row `FROZEN`. Also list: env vars, routes, query keys, form field names, `name`/`id`/`data-testid` attributes, ARIA labels used by tests.

## FROZEN: never modify
- API endpoints, HTTP methods, headers, payload and response shapes
- Environment variables and config files (`.env*`, `next.config.*`, `vite.config.*` except adding aliases/plugins strictly needed for styling)
- Data-fetching hooks, services, stores, reducers, selectors, zod/yup schemas, TypeScript types for API data
- Route paths, route handlers, middleware, auth logic
- Form field `name`s, validation rules, submit handlers
- Query keys and cache invalidation logic
- Test files and `data-testid` attributes (tests must still pass)

## ALLOWED: the only things you may change
- JSX structure and wrapper elements **around** existing logic
- CSS, Tailwind classes, design tokens, fonts, global styles
- Presentational components (new or restyled), animation wrappers
- Loading, empty and error *visuals* (the states and triggers stay the same)

## Safe replacement protocol
1. **Wrap, don't delete.** Keep the original logic-bearing component; swap its returned markup. Move to a `*.legacy.tsx` backup only when a full rewrite is needed, and delete nothing until verification passes.
2. **Preserve props contracts.** Restyled components keep identical prop names and types so callers don't change.
3. **Keep every handler wired.** Each existing `onClick`/`onSubmit`/`onChange` must be bound to the same function after the redesign. Re-run the Map to prove it.
4. **Preserve states.** Every `isLoading`, `isError`, `isEmpty`, `isFetching`, `disabled`, and optimistic-update branch must still render something, now in the new style.
5. **Keep accessibility attributes** (`aria-*`, `role`, `htmlFor`) and `data-testid`.
6. **Work in slices:** one route or feature at a time, with a verification pass after each slice. Commit after every slice.
7. **Git safety:** create a branch `ui-overhaul/<date>`. Never work on `main`.

## Verification (required after each slice and at the end)
- [ ] `git diff --stat` shows no changes to FROZEN paths. If any appear, revert them.
- [ ] `npm run lint`, `tsc --noEmit` and `npm run build` pass
- [ ] Existing tests pass
- [ ] Browser agent: for each route, trigger every button, form (valid and invalid), loading, empty and error state; confirm the same network calls fire (same URL, method and payload) as before
- [ ] Preservation Map re-checked: every row still `FROZEN` and unmodified

## Stop conditions
If a redesign step *requires* changing a FROZEN item, **stop and ask the user**. Never decide silently.