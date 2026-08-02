# Dashboard Redesign 1:1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Sessions, Session detail, and Settings/API keys to 1:1 with the mock, then pixel-pass Overview/Traces/Trace detail/Login/shell — frontend only, Analytics deferred, no commits until user asks.

**Architecture:** Keep page routes and React Query hooks. Restyle/restructure against `template.html`. Reuse `lib/format.ts`, `lib/sources.ts`, `components/ui/StatCard.tsx`, `SegmentedControl.tsx`. Persist trace UI prefs in localStorage.

**Tech Stack:** React + Vite + Tailwind v4 CSS variables, React Router, existing dashboard API hooks.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-02-dashboard-redesign-1to1-design.md`
- Visual truth: scratchpad `template.html` (sessions ~1098–1129, session ~1133–1171, settings ~991–1094)
- Do not commit unless the user explicitly asks
- Do not modify Analytics.tsx
- Do not add backend routes or fake metrics

---

### Task 1: Sessions list 1:1

**Files:**

- Modify: `apps/dashboard/src/pages/Sessions.tsx`
- Modify: `apps/dashboard/src/components/sessions/SessionsTable.tsx`
- Modify: `apps/dashboard/src/lib/agentSessions.ts` (only if missing display helpers)

**Interfaces:**

- Consumes: `useAgentSessionsQuery`, `summarizeApiAgentSession`, `fmtCost`/`fmtRel`/`fmtTokens`, `sourceLabel`
- Produces: Sessions page with mock topbar + grid table; URL filters preserved

- [x] **Step 1:** Rewrite `SessionsTable` as CSS-grid rows matching mock columns (Session, Agent·cwd, Models, Traces, Errors, Cost, Last active). Use token classes (`bg-surface`, `border-line`, `text-fg`, etc.). Error count as pill.
- [x] **Step 2:** Restructure `Sessions.tsx` header to 56px topbar pattern: 19px title, count label, 230px search. Move range/sort/source into a compact secondary row or menus so capability stays.
- [x] **Step 3:** Verify TypeScript: `cd apps/dashboard && bunx tsc -b --pretty false` (or project’s usual check). Fix type errors.
- [ ] **Step 4:** Manual check vs template sessions section (both themes when app runs). Do not commit.

---

### Task 2: Session detail 1:1

**Files:**

- Modify: `apps/dashboard/src/pages/SessionDetail.tsx`
- Create: `apps/dashboard/src/components/sessions/SessionTraceList.tsx`

**Interfaces:**

- Consumes: `useSessionTraceSummariesQuery`, `fmtDuration`/`fmtCost`/`fmtLatency`/`fmtRel`/`fmtTokens`, `StatCard` or mini surface tiles
- Produces: Mock summary card + flat chronological trace list; click opens `/dashboard/traces/:id` with return state

- [ ] **Step 1:** Add `SessionTraceList` — row grid: status dot | step # | summary | latency | cost | relative time | chevron; error rows use `bg` red-tint + inset left edge.
- [ ] **Step 2:** Rebuild `SessionDetail` layout: topbar back+idShort+errors; summary card with agentName/cwd + 5 stats; list below. Drop timeline card chrome.
- [ ] **Step 3:** Typecheck. Do not commit.

---

### Task 3: Settings + API keys 1:1

**Files:**

- Modify: `apps/dashboard/src/pages/Settings.tsx`
- Modify: `apps/dashboard/src/pages/ApiKeys.tsx` (redirect or embed)
- Modify: `apps/dashboard/src/components/api-keys/ApiKeyCard.tsx`, `ApiKeyList.tsx`, `CreateApiKeyModal.tsx`
- Modify: `apps/dashboard/src/components/settings/ProjectSettings.tsx`, `DangerZone.tsx`
- Create (as needed): `apps/dashboard/src/components/settings/AppearanceSettings.tsx`, `TraceDefaultsSettings.tsx`, `ProfileCard.tsx`
- Modify: `apps/dashboard/src/App.tsx` if redirecting `/api-keys`
- Create/Modify: small localStorage helper for row density / stats mode / IO format prefs shared with Traces

**Interfaces:**

- Consumes: `useTheme`, `useAuth` user fields, API key hooks, project hooks
- Produces: Narrow settings stack matching mock; `/api-keys` still reachable

- [ ] **Step 1:** Build Settings page card stack (Profile, Appearance, Trace defaults, API keys). Wire theme via existing ThemeContext.
- [ ] **Step 2:** Inline API key rows with two-step revoke and create CTA; restyle cards to tokens.
- [ ] **Step 3:** Keep Project settings / Danger zone / Users as additional token-styled sections below.
- [ ] **Step 4:** Point ApiKeys route at Settings (hash/section) or shared component. Typecheck. Do not commit.

---

### Task 4: Pixel-pass Overview / Traces / Trace detail / Login / shell

**Files:**

- Modify as needed: `Dashboard.tsx`, `RecentTracesTable.tsx`, chart wrappers, `Traces.tsx`, `TraceDetail.tsx`, `Login.tsx`, `Sidebar.tsx`, `Topbar.tsx`, related components

**Interfaces:**

- Consumes: existing analytics/traces hooks; localStorage prefs from Task 3 where applicable
- Produces: Headers/surfaces/tables closer to mock without inventing unavailable chart metrics

- [ ] **Step 1:** Replace legacy `neutral-950`/`neutral-900` page chrome with token topbar/content patterns on Overview and Traces.
- [ ] **Step 2:** Align Overview secondary sections (tool usage, recent traces) to mock card radius/padding; skip backend-missing hero latency histogram.
- [ ] **Step 3:** Align TraceDetail header/stat tiles to mock where low-risk.
- [ ] **Step 4:** Spot-check Login + shell spacing against template. Typecheck + `bun run build` + `bun run lint`. Do not commit.

---

### Task 5: Verification report (no commit)

- [ ] **Step 1:** `cd apps/dashboard && bun run build && bun run lint`
- [ ] **Step 2:** Summarize files changed, remaining known deltas vs mock, Analytics still deferred
- [ ] **Step 3:** Stop for user review of plan + UI; commit only if requested
