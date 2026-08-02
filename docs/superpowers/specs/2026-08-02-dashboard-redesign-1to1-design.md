# Dashboard redesign 1:1 visual match — design

**Date:** 2026-08-02  
**Branch:** `feat/dashboard-redesign`  
**Visual source:** `Traces Redesign - Standalone.html` → extracted `template.html` / `source.jsx`  
**Approach:** A — finish unfinished views, then pixel-pass completed ones

## Goal

Make in-scope dashboard views a 1:1 visual match of the mock while keeping routing, auth, queries, and mutations intact. Frontend only.

## Non-goals

- Analytics page restyle (deferred; accepted mismatch)
- New backend analytics queries or synthetic mock-only metrics
- Backend / SDK / ingest changes
- Git commits until the user reviews this plan and asks to commit

## Constraints (locked)

1. Keep react-router page split; do not port the mock’s single-component `view` state.
2. Use existing design tokens in `apps/dashboard/src/index.css` (`data-theme`).
3. Real data only — map mock fields to API types; never invent series the API does not serve.
4. Source badges use real `SPAN_SOURCES` via `src/lib/sources.ts` (not mock’s fake sources).
5. Span waterfall colours by kind + tool name (`src/lib/spanRows.ts`).
6. Both themes must look correct.
7. Preserve working filters/pagination/mutations even when the mock omits them — restyle or tuck into secondary UI; do not delete capability.

## In scope views

| Mock                  | Route                                          | Priority          |
| --------------------- | ---------------------------------------------- | ----------------- |
| sessions              | `/dashboard/sessions`                          | 1 — restructure   |
| session               | `/dashboard/sessions/:id`                      | 2 — restructure   |
| settings (+ API keys) | `/dashboard/settings` (+ redirect `/api-keys`) | 3 — merge/restyle |
| home                  | `/dashboard`                                   | 4 — pixel-pass    |
| list                  | `/dashboard/traces`                            | 4 — pixel-pass    |
| full                  | `/dashboard/traces/:id`                        | 4 — pixel-pass    |
| login                 | `/login`                                       | 4 — light pass    |
| shell                 | Sidebar + Topbar                               | 4 — light pass    |
| analytics             | `/dashboard/analytics`                         | **out**           |

## Target layouts (from template)

### Sessions

- Topbar: title 19px + `"N of M sessions"` + 230px search pill
- Body: `max-width:1240px`, single `rounded-16` surface card
- Grid columns: Session | Agent·cwd | Models | Traces | Errors | Cost | Last active
- Keep existing query params (range/sort/source/page) as secondary controls under the mock chrome

### Session detail

- Topbar: ← Sessions + idShort + error pill
- Summary card: agentName 22px + cwd; 5 mini stats (Traces, Duration, Cost, Tokens, Errors)
- Chronological flat trace rows (not timeline cards); navigate to trace detail with return context

### Settings

- Narrow column `max-width:640px`
- Cards: Profile → Appearance (theme) → Trace defaults (localStorage prefs) → API keys inline
- Project settings / danger zone / users: keep functional, restyle as additional sections below mock cards
- `/dashboard/api-keys` redirects to Settings API keys section

### Pixel-pass (home / list / full / login / shell)

- Replace remaining `neutral-950` / legacy chart card chrome with token surfaces
- Align headers to 19px title + mock right-side controls
- Overview: prefer mock structure where real data exists (stat strip, tool usage, recent rows); do not add hero chart metrics the API cannot back
- Trace detail: align header/stat tiles/topbar actions where cheap without breaking waterfall

## Success criteria

1. Sessions / Session detail / Settings visually match `template.html` in dark and light.
2. Existing list filters, session navigation, API key create/reveal/revoke, theme toggle still work.
3. `bun run build` and `bun run lint` clean in `apps/dashboard`.
4. Analytics left alone.
5. No commits until user approval of this plan + finished UI review.
