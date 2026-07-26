# Changelog

## Unreleased

### Move Docs into Pulse Monorepo

Date: 2026-07-26 CDT; Status: In Progress
Changed: Docs now build and run from `apps/docs` through the shared Pulse workspace and CI.
Fixed: Corrected API links, SDK field names and examples, analytics timestamps, runtime support, Docker persistence, and font loading.

### Document OTel Trace Model

Date: 2026-07-25 CDT; Status: In Progress; PR: #5 https://github.com/EK-LABS-LLC/pulse-docs/pull/5
Task: Update docs for the Session -> Trace -> Span architecture and OTLP HTTP JSON ingest.
Added/Changed: Quickstart, dashboard, sessions, SDK, CLI, and agent docs explain the unified source-aware Session -> Trace -> Span model.
Added: Codex integration setup, event mapping, trust, update, and troubleshooting guidance.
Changed: Setup leads with `pulse up --open`; updates lead with `pulse update`, restart, hook refresh, and status verification.
Fixed/Removed: Removed deleted legacy trace endpoints and unsupported SDK naming options from the docs.

### Make Auth Simpler - Docs Site Local Flow

Date: 2026-06-23 16:04:38 CDT; Status: Completed; PR: TBD
Task: Update docs-site setup pages for the simplified local auth flow.
Message: Quickstart, CLI, dashboard UI, agent integration, and release docs now teach `pulse up` then `pulse dashboard`.
Added/Changed: Manual `pulse setup --local` remains documented only as manual/advanced bootstrap.
Fixed/Removed: Removed stale local setup flow that required `pulse setup --local` before `pulse up`.
Handoff: Pair with trace-service PR #7 and CLI PR #4.
