# Dashboard redesign — handoff

Branch: `feat/dashboard-redesign` (off `main`). Not yet pushed, no PR open.

## Where this came from

`Traces Redesign - Standalone.html` at the repo root is a bundler-packed mock.
It is untracked and **should be gitignored** — that decision was made but never
applied. Extracted sources (do not re-extract, they already exist):

```
/private/tmp/claude-501/-Users-davontaejackson-dev-pulse/b978af1e-ead8-4b04-8e53-f10bd2c9c41f/scratchpad/
  source.jsx          1036 lines — the mock's single Component class, all views
  template.html       2558 lines — rendered DOM, the visual target per view
  design-tokens.css   both token sets, verbatim
  REDESIGN-SPEC.md    the original plan (see corrections below)
```

If that scratchpad is gone, re-extract from the root HTML: line 376 is a
manifest of gzip+base64 assets, the `text/x-dc` script holds the source.

## Decisions already made — do not relitigate

1. `service` is a real column. Shipped in PR #4, on `main`.
2. **Analytics is deferred.** `src/pages/Analytics.tsx` (686 lines) stays as is.
   It will visually mismatch. That is accepted.
3. Both themes ship, with a toggle, persisted. Every view must be checked in
   light _and_ dark.
4. The user does not want verbose explanatory comments. Keep them minimal and
   only where the code cannot express the constraint.

## Corrections to REDESIGN-SPEC.md

The spec is mostly right but has two errors found during implementation:

- Span kind is **`tool_use`**, not `tool_call`. Real enum in
  `packages/api-contracts/src/index.ts`: `llm_call, tool_use, agent_run,
session, user_prompt, llm_response, notification`.
- The mock's `source` values (`claude-code`, `api`, `agent-sdk`) are not real.
  `SPAN_SOURCES` is `claude_code, codex, opencode, openclaw, sdk`. Badge labels
  CC / CDX / OC / OCW / SDK are implemented in `src/lib/sources.ts`.

## What is done

| Commit    | What                                |
| --------- | ----------------------------------- |
| `f5f22db` | Token layer                         |
| `3c04e2d` | Shell — icon rail + topbar          |
| `fcaba88` | Theming of all views + traces table |

### Token layer — `src/index.css`

Both token sets are plain CSS variables under `:root, [data-theme="dark"]` and
`[data-theme="light"]`. The `@theme` block aliases Tailwind colour names onto
them via `var()`, so utilities resolve at runtime and the theme switches
without a reload. Verified end to end:

```
.bg-surface { background-color: var(--color-surface) }
  --color-surface: var(--surface)
  --surface: #17171a / #f0f0f3
```

**The important trick:** the `neutral-*` scale and `accent`/`success`/`error`
were repointed at tokens rather than editing ~950 call sites. Any view written
against `text-neutral-500` etc. is already themed. `tailwind.config.js` no
longer defines colours — defining them there shadows the aliases.

Theme runtime: `contexts/theme-context.ts`, `contexts/ThemeContext.tsx`,
`hooks/useTheme.ts`, plus a pre-paint script in `index.html` that must stay in
sync with `ThemeProvider`'s resolution order (stored → system → dark).

### Shell

- `components/layout/Sidebar.tsx` — 56px icon rail, tooltip on hover.
- `components/layout/Topbar.tsx` — project selector, theme toggle, user menu.
  Both menus dismiss on outside click and Escape.
- `components/layout/Layout.tsx` — wires them together.

### Helpers ported from the mock

- `src/lib/format.ts` — `fmtLatency/fmtDuration/fmtCost/fmtTokens/fmtRel/fmtAbs`,
  `sparkPath`, `tint`. `tint` uses `color-mix` for `var()` colours since the
  mock's hex-parsing `rgba()` cannot handle them.
- `src/lib/tokenizeJson.ts` — returns CSS-var colours, so a theme change does
  not require re-tokenizing.
- `src/lib/spanRows.ts` — `buildSpanRows`. Real spans carry absolute
  timestamps, so offsets are derived against the earliest span (the mock had
  precomputed `offsetMs`). Colours by kind + tool name.
- `src/lib/sources.ts` — real source enum labels.

### Components

- `components/ui/StatCard.tsx`, `SegmentedControl.tsx`, `StatusDot.tsx` — new.
- `components/traces/JsonViewer.tsx` — rewritten on `tokenizeJson`, kept its
  `{data, title}` props and copy/collapse.
- `components/traces/TraceSpanTree.tsx` — now a waterfall. **Props changed**:
  was `{spans, indentPx}`, now `{spans, activeSpanId?, onSelect?}`.
- `components/traces/TracesTable.tsx` — redesign row.

## What is NOT done

Views still on the old layout (themed, but not restructured to the mock):

- `pages/Dashboard.tsx` (459) — should use `StatCard` with sparklines
- `pages/TraceDetail.tsx` (135) — should use the waterfall + a detail panel
- `pages/Sessions.tsx` (580)
- `pages/SessionDetail.tsx` (518)
- `pages/Settings.tsx` (115), `pages/ApiKeys.tsx` (530)

Consult `template.html` per view for layout. Build order from here:
trace detail → home → sessions → session detail → settings/API keys.

Also outstanding:

- Gitignore `Traces Redesign - Standalone.html`.
- Add a `CHANGELOG.md` entry. The dashboard has no changelog of its own —
  dashboard changes are logged in `apps/server/CHANGELOG.md`. Copy that file's
  bespoke format exactly (`### Title Case`, then `Date: … ; Status: … ; PR: #N`,
  then `Task:`/`Added:`/`Changed:`/`Fixed:`). Add to `## Unreleased`.
- No tests were added. Check whether `tooling/test-integrity/baseline.json`
  needs rebaselining if you add any (CI now permits it for touched files).

## Data reality — read before building views

The mock invents numbers the API does not serve. Do not fabricate them.

**Missing entirely — no query exists.** `LatencyBucket` and `LatencyPercentiles`
are declared in `apps/server/db/analytics.ts:59-74` with no implementing
function, and `routes/analytics.ts` never references them:

- p50 / p95 latency
- latency histogram
- error-type taxonomy
- per-tool failure rates
- day×hour request heatmap

These are deferred with Analytics. Either build the server queries or leave the
cards out — do not ship a synthetic sine curve.

**Available:** `ApiAgentSessionSummary` fully backs the sessions views
(duration, agentRuns, toolCalls, traceCount, tokens, cost, errorCount, sources,
cwd, agentName, model). API keys view is backed including reveal/copy.

## Real data — no fixtures

`apps/server/scripts/ingest-dev-data.ts` fills a running server by driving the
**real SDK** (`initPulse` / `recordSpan` / `flush`) over the real OTLP
transport. Nothing writes to the database directly and no response is faked.

```sh
cd apps/server && PULSE_PROJECTS=2 bun run scripts/ingest-dev-data.ts
```

Creates at most 3 projects (default 2), each with a distinct `service.name`,
reusing what signup already made rather than piling up new ones. Verified
output on a live server:

```
total traces: 50   error traces: 10   service=pulse-api total: 50
{'status':'success','services':['pulse-api'],'modelUsed':'claude-sonnet-4.5',
 'inputTokens':4264,'outputTokens':1244,'costCents':3.1452,'spanCount':6}
{'status':'error','services':['pulse-api'],'errorService':'pulse-api'}
```

So tokens, cost, model, `services[]` and `errorService` are all exercised for
real — the columns that read `—` under the old seed script now carry values.

Prefer this over `scripts/seed.ts` for anything the dashboard is judged on.

## Running it — verified working setup

Use an isolated `PULSE_HOME`. **Do not use the default** — the user has a real
dev database at `~/.pulse/.data/pulse.db`.

```sh
export SCRATCH=/private/tmp/claude-501/-Users-davontaejackson-dev-pulse/8265b178-ad6f-42c5-9c28-0066a473366b/scratchpad
export PULSE_HOME="$SCRATCH/pulse-home"

cd apps/server
bun run db:migrate

PULSE_HOME="$PULSE_HOME" PORT=3399 \
  BETTER_AUTH_SECRET=local-dev-secret-for-redesign-verification \
  BETTER_AUTH_URL=http://localhost:3399 \
  PULSE_ALLOWED_ORIGINS=http://localhost:5199 \
  bun run pulse.ts &

cd ../dashboard
VITE_API_PROXY_TARGET=http://127.0.0.1:3399 bunx vite --port 5199 --strictPort &
```

`PULSE_ALLOWED_ORIGINS` is required or better-auth rejects the Vite origin with
`INVALID_ORIGIN`. Vite binds `localhost`, not `127.0.0.1` — curl accordingly.

Then ingest through the SDK (preferred). The older seed script:

```sh
cd apps/server
SEED_BASE_URL=http://127.0.0.1:3399 SEED_EMAIL=redesign@pulse.test \
  SEED_PASSWORD='RedesignPass!123' SEED_NAME="Redesign User" \
  SEED_PROJECT_NAME="Redesign Project" SEED_SESSIONS=12 \
  SEED_TRACES_PER_SESSION=6 SEED_SPANS_PER_SESSION=14 SEED_DAYS_BACK=7 \
  bun run scripts/seed.ts
```

Seeded: 12 sessions, 72 traces, 1190 spans. Credentials above are a throwaway
local fixture.

**Two gotchas:**

1. Seeding creates a _second_ project — signup already made a bootstrap one,
   and both are named "Redesign Project". The app auto-selects the first, which
   is empty. Pick the second in the topbar selector or you will see 0 traces.
2. Sign in from the browser console rather than the form:

```js
await fetch("/api/auth/sign-in/email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    email: "redesign@pulse.test",
    password: "RedesignPass!123",
  }),
});
```

## Note on scripts/seed.ts

The older `scripts/seed.ts` emits agent-style spans with no tokens, cost or
service, so Service reads `—` and Tokens `0`. That is correct on that data, not
a rendering bug — but use `ingest-dev-data.ts` instead so those columns are
actually exercised.

## Verification standard

A green `bun run build` proves nothing. Drive each view in the browser against
the seeded server, in both themes, before calling it done.
