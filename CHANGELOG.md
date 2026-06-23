# Changelog

## Unreleased

### Make Auth Simpler - Docs Site Local Flow

Date: 2026-06-23 16:04:38 CDT; Status: Completed; PR: TBD
Task: Update docs-site setup pages for the simplified local auth flow.
Message: Quickstart, CLI, dashboard UI, agent integration, and release docs now teach `pulse up` then `pulse dashboard`.
Added/Changed: Manual `pulse setup --local` remains documented only as manual/advanced bootstrap.
Fixed/Removed: Removed stale local setup flow that required `pulse setup --local` before `pulse up`.
Handoff: Pair with trace-service PR #7 and CLI PR #4.
