# Changelog

## Unreleased

### Redesign The Dashboard And Record Spans From The SDK

Date: 2026-08-02 CDT; Status: In Progress
Task: Move the dashboard onto the new design and let the SDK emit the spans that design assumes.
Added: Dashboard ships a light and a dark theme with a toggle in the top bar and on the sign-in page, and remembers the choice.
Changed: Navigation collapses to an icon rail with hover labels, and account and theme controls move into the bottom of the rail.
Changed: The Overview chart shows detailed time-series lines with hover values and clickable series tags.
Added: `GET /v1/analytics/overview-extended` returns request, cost, token, and latency series split by model, provider, source, or service.
Added: Overview analytics reports p50, p95, and p99 latency percentiles from LLM request spans.
Changed: Trace detail shows the span waterfall beside an inspector for the selected span, and names the service that owned the first failure.
Changed: Traces list rows carry a status dot, source badge, service, and latency and token meters.
Changed: Sign-in moves to a split layout on the new palette.
Added: `recordSpan` in the TypeScript SDK emits agent, tool and provider spans directly, so callers no longer have to wrap a provider client; `shutdownPulse` flushes and stops the flush interval so short-lived processes exit.
Fixed: Average session duration is measured from a session's own spans instead of a lifecycle span, which agent and SDK traffic often never emits and which reported every session as zero.
Fixed: Overview error rate and success rate are drawn from the same spans, so the two no longer contradict each other.
Added: `GET /v1/analytics/spans` reports per-service request, error and average duration rollups.
Changed: Traces opens on an overview strip and a Services table, and filters move to status and source chips carrying live counts; selecting a service scopes the query.
Fixed: Server startup adds the span service column and index to fresh and existing databases, preventing service analytics and filters from returning an internal server error.
Changed: The SDK-driven dashboard fixture fills up to 30 days with multiple services, models, providers, latency bands, token usage, costs, and failures, with extra recent sessions so sub-day charts remain representative.
Changed: Overview uses the dashboard's existing Recharts stack for smooth monotone area curves on one shared timeline, with a darker layered shadow and richer gradient fill for every series, empty additive buckets shown as zero, and missing latency buckets kept as gaps.
Added: Overview charts can group millisecond-resolution span data into 15-minute, hourly, or daily buckets, with Auto choosing 15 minutes for 24 hours, hourly for 7 days, and daily for 30 days.
Changed: Overview uses the same segmented picker for chart intervals as its other chart controls, removes the standalone latency percentile labels, shows the calendar window beside the selected range, chooses a sensible interval when the range changes, and keeps dates visible on sub-day chart axes and tooltips.
Changed: Overview curves use natural interpolation and a short animated transition when measures, splits, or intervals change.
Changed: Tool usage bars use one consistent blue accent across every tool.
Changed: Overview shows a live period trend beside the primary metric, uses the design's system-first font stack, and tightens the most-failures controls.
Changed: Light mode uses slightly darker borders to improve separation between overview surfaces and controls.
Added: Overview has a reusable From/To calendar picker at the far right of the chart summary, with chart interval selection in the same anchored panel and 24-hour, 7-day, or 30-day shortcuts.
Changed: Overview centers the most-failing service and its label as a compact status group without a redundant Investigate action.
Changed: Overview uses rounder, tighter cards for its chart, metric strip, health, tool, and recent-trace sections, and recent traces show services as compact tags with an explicit View all traces action.
Fixed: Recent traces use a recorded trace or agent-run summary as their title instead of replacing it with the model name.
Changed: Traces uses rounded, tighter metric, service, filter, and list surfaces; every metric shows a real 24-hour trend and comparison; active filters use a compact charcoal state with a darker edge and white text; and trace rows combine summary, service, and model beside compact duration, usage, and relative-time fields without overflowing the table.
Changed: Traces trend tags use green for positive percentages and red for negative percentages.
Added: Traces has a reusable query builder that reflects service, sidebar, search, model, session, and date filters above the results table; summary searches are URL-backed and filter trace results on the server.
Changed: Failed trace rows keep the standard table background and use red only for the status dot, service tag, and duration.
Fixed: Traces keeps the current rows and totals visible while service or query filters load, and Overview keeps its existing analytics and chart mounted while ranges, measures, splits, or intervals refresh, eliminating full-surface flashes between selections.
Changed: The reusable query builder reserves its full top row for the query expression and keeps filter chips, filter controls, and the result count together on a separate row below it.
Changed: The Traces filter panel now eases between its expanded and collapsed widths without unmounting, and denser trace rows align the duration and usage meters on one shared baseline.
Changed: Trace rows now open the dedicated detail route instead of an in-page drawer; the detail view adds model and token context, request/response Chat and JSON views, metadata and selected-span inspection, and a full-width ruler-based span timeline whose duration labels remain inside the card without a separate error-origin banner.
Fixed: Returning from a trace detail view restores the originating Traces URL so its query filters, service and source selections, pagination, and page size remain intact.
Changed: Selecting a model or tool turn in the span timeline now opens its detail directly below the timeline.
Changed: Overview, Traces, Sessions, Analytics, and trace-detail selections now use shareable URL parameters, including ranges, chart settings, searches, pagination, request/response views, and selected spans.
Fixed: Trace and session detail breadcrumbs preserve the validated originating URL, so returning from a detail opened on Overview or a filtered list restores that exact page instead of redirecting to a generic list.
Changed: Overview recent traces now matches the compact design with six rows and a focused status, summary, service, latency, and time layout.
Changed: Traces removes the duplicate source selector from the top toolbar while retaining source filtering in the query builder and filter sidebar.
Fixed: Traces source filters show live trace totals for every source under the rest of the active query instead of displaying placeholder zeroes.
Changed: Sessions matches the compact reference table with denser rows, type, tags, columns, and padding; removes its extra toolbar and live indicator; keeps error emphasis inside the error badge; and only shows pagination when multiple pages exist.
Changed: Sessions shows 15 rows per page by default while retaining 25, 50, and 100 row options.
Changed: Analytics displays a focused under-development message while the redesigned experience is being built.

### Allow Test Changes To Rebaseline The Integrity Guard

Date: 2026-08-01 CDT; Status: In Progress; PR: #5 https://github.com/EK-LABS-LLC/pulse/pull/5
Task: Let a pull request that legitimately adds or edits a test update the test-integrity baseline in the same commit.
Fixed: The test-integrity guard reads `baseline.json` from the branch instead of the base commit, so adding or changing a test no longer fails CI with no way to pass.
Added: A follow-up CI step rejects baseline entries that were added, dropped, or altered for test files the branch does not modify, so rebaselining stays scoped to the tests a change actually touches.

### Attribute Spans To Their Service

Date: 2026-07-29 CDT; Status: In Progress; PR: #4 https://github.com/EK-LABS-LLC/pulse/pull/4
Task: Make the OTel `service.name` resource attribute a queryable span dimension instead of an opaque metadata entry.
Changed: Bumped trace-service package version to 0.2.17.
Added: Spans carry a first-class `service` field, populated from the `service.name` resource attribute of the OTLP export and applied to every span in that resource batch.
Added: `GET /v1/spans` and `GET /v1/traces` accept a `service` filter.
Added: Trace summaries list the distinct `services` a trace touched and report `errorService`, the service that owned the first failing span.
Changed: `service.name` is no longer duplicated into span metadata now that it has a column.

### Scope Version Guard To Shipping Files

Date: 2026-07-29 CDT; Status: In Progress; PR: #3 https://github.com/EK-LABS-LLC/pulse/pull/3
Task: Stop the server version guard from demanding a release bump for changes that ship nothing.
Fixed: `server_release` CI path filter now lists server, dashboard, and API contract source instead of matching whole directories, so changelog, README, design docs, tests, and local-only config no longer require a version bump.

### Prepare Monorepo Cutover

Date: 2026-07-25 CDT; Status: Completed; PR: #1 https://github.com/EK-LABS-LLC/pulse/pull/1
Changed: Server and dashboard builds now use the shared Pulse workspace and API contracts while remaining independently deployable.
Changed: Repository development commands now use root Just recipes and shared root tooling configuration.
Changed: Installer discovery supports `server-v*` and `cli-v*` monorepo releases and falls back to existing trace-service and trace-cli releases during cutover.
Fixed: Release bridging validates the latest legacy service assets, and installer fallback now occurs only when a complete paginated GitHub lookup finds no namespaced release.
Fixed: Container builds use the monorepo root ignore rules without copying server migrations or tests into the build context.

### Unify Traces And Sessions On Spans

Date: 2026-07-21 21:30 CDT; Status: Completed; PR: #18 https://github.com/EK-LABS-LLC/trace-service/pull/18
Task: Derive traces and sessions from OTLP spans so agent and SDK traffic share one traces view.
Changed: Bumped trace-service package version to 0.2.16.
Changed: `GET /v1/traces` returns span-derived summaries for every source and accepts a `source` filter, replacing the SDK-only merge path.
Added: Trace summaries adapt to their source, keeping model, token, and cost fields for SDK traces and reporting tool-call and file-edit counts for agent traces.
Added: `queryTraceIds` on the SQLite and Postgres adapters excludes session lifecycle events by event type so `stop` spans are retained.
Removed: Legacy trace ingest endpoints, the trace-ingest event bus listener, and the `traces` and `sessions` tables.
Changed: Dashboard traces table shows source as a badge and filter instead of splitting LLM and agent traffic into separate views.
Changed: Dashboard views render placeholders for cost and token fields and omit provider and model badges on agent traces, which carry none of those values.
Changed: Dashboard Sessions uses one paginated, URL-backed list with source filtering, mixed-source badges, aggregate trace/span/token/cost metrics, and trace-detail drill-down.
Fixed: Session summaries exclude lifecycle-only and trace-less sessions, preserve mixed-source aggregates while filtering, ignore null trace IDs, and compute duration from the session boundary instead of a stop turn.
Fixed: Dashboard Sessions formats hour-long durations consistently, preserves pagination after query errors, and distinguishes empty search results from an empty dataset.
Removed: Stale trace-WAL configuration and legacy direct-JSON trace endpoint documentation.
Added: Migration coverage proves populated legacy trace/session tables are removed in foreign-key-safe order without deleting spans.

### Accept Canonical Agent OTLP Attributes

Date: 2026-07-19 15:40 CDT; Status: Completed; PR: #17 https://github.com/EK-LABS-LLC/trace-service/pull/17
Task: Make the OTLP ingest contract preserve the structured agent telemetry emitted by trace-cli.
Added/Changed: OTLP AnyValue decoding now supports nested arrays and key-value lists, maps canonical agent fields into first-class span columns, and flattens `pulse.metadata` into span metadata.

### Make WAL Acknowledgments Durable

Date: 2026-07-19 14:53 CDT; Status: Completed; PR: #17 https://github.com/EK-LABS-LLC/trace-service/pull/17
Task: Ensure accepted WAL records reach stable storage before successful ingestion responses under the default sync configuration.
Fixed: WAL segment syncs now fsync the active descriptor before closing it and propagate durability failures to callers.

### Fix Sessions Agent Dashboard

Date: 2026-07-05 10:00 CDT; Status: Completed; PR: #13 https://github.com/EK-LABS-LLC/trace-service/pull/13
Task: Make Sessions -> Agents stable and URL-backed.
Changed: Bumped trace-service package version to 0.2.14.
Fixed/Changed: Agent sessions now use backend grouped span summaries instead of a 500-span frontend window, preserving totals and dates as span volume grows.
Added/Changed: Sessions date range and sort controls are functional, URL-backed, and styled as dashboard-native toolbar menus.

### Add Install Version Metadata

Date: 2026-06-28 00:00 CDT; Status: Completed; PR: #12 https://github.com/EK-LABS-LLC/trace-service/pull/12
Task: Let the CLI detect installed server/dashboard release versions.
Changed: Bumped trace-service package version to 0.2.13.
Added: Installer writes `.pulse-install.toml` next to installed binaries.

### Fix Version Guard Release Baseline

Date: 2026-06-24 21:56 CDT; Status: Completed; PR: #11 https://github.com/EK-LABS-LLC/trace-service/pull/11
Task: Compare service version checks against released tags instead of main.
Changed: Bumped trace-service package version to 0.2.12.
Fixed: PR CI now requires package.json to be above the latest release tag.

### Guard Service Release Version

Date: 2026-06-24 18:25 CDT; Status: Completed; PR: #10 https://github.com/EK-LABS-LLC/trace-service/pull/10
Task: Add an internal service version and prevent stale release versions from merging.
Changed: Added trace-service package version 0.2.11.
Added: PR CI now checks that package.json is bumped above main/latest tag.

### Codex Span Source Support

Date: 2026-06-23 17:45 CDT; Status: Completed; PR: #9 https://github.com/EK-LABS-LLC/trace-service/pull/9
Task: Accept spans emitted by the new Codex CLI hook integration.
Message: Service validation and dashboard types now include `codex` as an agent span source.
Added/Changed: Added validation coverage so Codex spans can be ingested and shown with other agent sessions.

### Agent Session Display Names

Date: 2026-06-23 17:18 CDT; Status: Completed; PR: #8 https://github.com/EK-LABS-LLC/trace-service/pull/8
Task: Make agent sessions easier to connect to the real AI conversation.
Message: Dashboard agent sessions now show a friendly name from title, first prompt, folder, or short ID.
Changed/Added: Search covers friendly name, folder, model, source, prompt, and raw session ID.

### Make Auth Simpler - Operations Docs Sweep

Date: 2026-06-23 16:04:38 CDT; Status: Completed; PR: #7 https://github.com/EK-LABS-LLC/trace-service/pull/7
Task: Reflect simplified local auth flow in service operations docs.
Message: Operations docs now point local managed installs to `pulse up` then `pulse dashboard`.
Added/Changed: `docs/operations.md` notes first-run bootstrap and confirms config stores API URL/key/project/server command, not dashboard credentials.
Fixed/Removed: Removed stale expectation that local users manage dashboard email/password in setup docs.
Handoff: Pair with CLI PR #4 and pulse-docs branch `docs/make-auth-simpler-local-flow`.

### Make Auth Simpler - Final Local Smoke And Docs

Date: 2026-06-23 15:44:20 CDT; Status: Completed; PR: #7 https://github.com/EK-LABS-LLC/trace-service/pull/7
Task: Verify final local auth flow and align installed-binary docs.
Message: Fresh `pulse up` bootstrap, local dashboard login, API trace/span ingest, and SDK connectivity were smoke-tested against local trace-service.
Added/Changed: README now documents `pulse up` then `pulse dashboard` after installing server+CLI binaries.
Fixed/Removed: No service behavior changed; documentation now matches the simplified local auth flow.
Handoff: Paired CLI PR #4; local smoke used isolated HOME with config containing no `local_email` or `local_password`.

### Make Auth Simpler - API-Key Local Dashboard Login

Date: 2026-06-23 15:28:20 CDT; Status: Completed; PR: #7 https://github.com/EK-LABS-LLC/trace-service/pull/7
Task: Replace local dashboard email/password handoff with API-key backed local login.
Message: Local dashboard auth now uses the CLI API key/project id to mint a short-lived loopback login URL.
Added/Changed: `/dashboard/api/local-login-token` accepts API-key payloads, creates a Better Auth session for the project admin, and keeps old email/password payloads compatible.
Fixed/Removed: Prevents local login-screen lockout; no public API removed and remote/shared auth is unchanged.
Handoff: Paired CLI PR #4; server restarts only invalidate unconsumed in-memory login URLs; verified with `bun test tests/local-login.test.ts lib/local-secrets.test.ts lib/crypto.test.ts tests/validation.test.ts`.
