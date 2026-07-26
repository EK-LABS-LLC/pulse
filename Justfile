set shell := ["bash", "-euo", "pipefail", "-c"]

default:
    @just --list

# Install all workspace dependencies
[group("workspace")]
setup:
    bun install --frozen-lockfile
    uv sync --project sdks/python --python 3.12 --frozen

# Run every credential-free verification suite
[group("workspace")]
check: dashboard-check server-test-all cli-check sdk-ts-check sdk-py-check contracts-check tests-integrity

# Validate shared OTEL attributes
[group("workspace")]
contracts-check:
    uv run --script tooling/contracts/check.py

# Verify immutable test content and guard behavior
[group("workspace")]
tests-integrity:
    uv run --locked --script tooling/test-integrity/check.py --self-test
    uv run --locked --script tooling/test-integrity/check.py

# Start the dashboard development server
[group("dashboard")]
[working-directory("apps/dashboard")]
dashboard-dev:
    bun run dev

# Build and lint the dashboard
[group("dashboard")]
[working-directory("apps/dashboard")]
dashboard-check:
    bun run build
    bun run lint

# Format dashboard sources
[group("dashboard")]
[working-directory("apps/dashboard")]
dashboard-format:
    bun run format

# Install server dependencies
[group("server")]
[working-directory("apps/server")]
server-install:
    bun install

# Start local SQLite development
[group("server")]
[working-directory("apps/server")]
server-dev: server-migrate
    bun run pulse.ts

# Start only the local SQLite API
[group("server")]
[working-directory("apps/server")]
server-dev-api: server-migrate
    PULSE_RUNTIME_MODE=api bun run pulse.ts

# Start only the local SQLite listeners
[group("server")]
[working-directory("apps/server")]
server-dev-listener:
    PULSE_RUNTIME_MODE=listener bun run pulse.ts

# Start scale mode
[group("server")]
[working-directory("apps/server")]
server-dev-scale:
    PULSE_MODE=scale bun run pulse.ts

# Start only the scale-mode API
[group("server")]
[working-directory("apps/server")]
server-dev-scale-api:
    PULSE_MODE=scale PULSE_RUNTIME_MODE=api bun run pulse.ts

# Start only the scale-mode listeners
[group("server")]
[working-directory("apps/server")]
server-dev-scale-listener:
    PULSE_MODE=scale PULSE_RUNTIME_MODE=listener bun run pulse.ts

# Start the local scale-mode PostgreSQL service
[group("server")]
[working-directory("apps/server")]
server-scale-up port="55433":
    PULSE_SCALE_PG_PORT="{{ port }}" docker compose -f docker-compose.scale.yml up -d postgres

# Stop the local scale-mode PostgreSQL service
[group("server")]
[working-directory("apps/server")]
server-scale-down port="55433":
    PULSE_SCALE_PG_PORT="{{ port }}" docker compose -f docker-compose.scale.yml down -v

[group("server")]
server-up port="55433": (server-scale-up port)

[group("server")]
server-down port="55433": (server-scale-down port)

# Run SQLite migrations
[group("server")]
[working-directory("apps/server")]
server-migrate:
    bun run db:migrate

# Apply scale-mode PostgreSQL migrations
[group("server")]
[working-directory("apps/server")]
server-migrate-scale:
    PULSE_MODE=scale bun run db:migrate:scale

# Generate a database migration
[group("server")]
[working-directory("apps/server")]
server-migrate-generate:
    bun run db:generate

# Push the current database schema
[group("server")]
[working-directory("apps/server")]
server-migrate-push:
    bun run db:push

# Open Drizzle Studio
[group("server")]
[working-directory("apps/server")]
server-studio:
    bun run db:studio

# Seed a local server using SEED_EMAIL and SEED_PASSWORD
[group("server")]
[working-directory("apps/server")]
server-seed:
    @test -n "${SEED_EMAIL:-}" || { echo "SEED_EMAIL is required" >&2; exit 1; }
    @test -n "${SEED_PASSWORD:-}" || { echo "SEED_PASSWORD is required" >&2; exit 1; }
    SEED_BASE_URL="${SEED_BASE_URL:-http://localhost:3000}" \
        SEED_EMAIL="${SEED_EMAIL}" \
        SEED_PASSWORD="${SEED_PASSWORD}" \
        SEED_NAME="${SEED_NAME:-Seed User}" \
        SEED_PROJECT_NAME="${SEED_PROJECT_NAME:-Seed Project}" \
        SEED_SESSIONS="${SEED_SESSIONS:-50}" \
        SEED_TRACES_PER_SESSION="${SEED_TRACES_PER_SESSION:-20}" \
        SEED_SPANS_PER_SESSION="${SEED_SPANS_PER_SESSION:-30}" \
        SEED_DAYS_BACK="${SEED_DAYS_BACK:-14}" \
        bun run scripts/seed.ts

# Seed an existing project using dashboard credentials
[group("server")]
[working-directory("apps/server")]
server-seed-existing-project:
    @test -n "${SEED_PROJECT_ID:-}" || { echo "SEED_PROJECT_ID is required" >&2; exit 1; }
    @test -n "${SEED_EMAIL:-}" || { echo "SEED_EMAIL is required" >&2; exit 1; }
    @test -n "${SEED_PASSWORD:-}" || { echo "SEED_PASSWORD is required" >&2; exit 1; }
    SEED_BASE_URL="${SEED_BASE_URL:-http://localhost:3000}" \
        SEED_EMAIL="${SEED_EMAIL}" \
        SEED_PASSWORD="${SEED_PASSWORD}" \
        SEED_PROJECT_ID="${SEED_PROJECT_ID}" \
        SEED_SESSIONS="${SEED_SESSIONS:-50}" \
        SEED_TRACES_PER_SESSION="${SEED_TRACES_PER_SESSION:-20}" \
        SEED_SPANS_PER_SESSION="${SEED_SPANS_PER_SESSION:-30}" \
        SEED_DAYS_BACK="${SEED_DAYS_BACK:-14}" \
        bun run scripts/seed.ts

# Seed a project using SEED_PROJECT_ID and SEED_API_KEY
[group("server")]
[working-directory("apps/server")]
server-seed-with-api-key:
    @test -n "${SEED_PROJECT_ID:-}" || { echo "SEED_PROJECT_ID is required" >&2; exit 1; }
    @test -n "${SEED_API_KEY:-}" || { echo "SEED_API_KEY is required" >&2; exit 1; }
    SEED_BASE_URL="${SEED_BASE_URL:-http://localhost:3000}" \
        SEED_PROJECT_ID="${SEED_PROJECT_ID}" \
        SEED_API_KEY="${SEED_API_KEY}" \
        SEED_SESSIONS="${SEED_SESSIONS:-50}" \
        SEED_TRACES_PER_SESSION="${SEED_TRACES_PER_SESSION:-20}" \
        SEED_SPANS_PER_SESSION="${SEED_SPANS_PER_SESSION:-30}" \
        SEED_DAYS_BACK="${SEED_DAYS_BACK:-14}" \
        bun run scripts/seed.ts

# Run server tests with the test environment
[group("server")]
[working-directory("apps/server")]
server-test:
    bun test --env-file=.env.test

_server-e2e mode split="0":
    cd apps/server && SPLIT="{{ split }}" bash scripts/run-e2e.sh "{{ mode }}"

# Run the server single-mode E2E suite
[group("server")]
server-test-e2e: (_server-e2e "single")

# Run the server split single-mode E2E suite
[group("server")]
server-test-e2e-split: (_server-e2e "single" "1")

# Run the server scale-mode E2E suite
[group("server")]
server-test-e2e-scale: (_server-e2e "scale")

# Run the server split scale-mode E2E suite
[group("server")]
server-test-e2e-scale-split: (_server-e2e "scale" "1")

# Run all server E2E modes
[group("server")]
server-test-all: server-test-e2e server-test-e2e-split server-test-e2e-scale server-test-e2e-scale-split

# Run server tests in watch mode
[group("server")]
[working-directory("apps/server")]
server-test-watch:
    bun test --watch --env-file=.env.test

# Build the server and dashboard assets
[group("server")]
[working-directory("apps/server")]
server-build:
    bun run build:pulse

[group("server")]
server-build-scale: server-build

# Build all server release artifacts
[group("server")]
[working-directory("apps/server")]
server-release-artifacts:
    bun run release:artifacts

# Format server sources
[group("server")]
[working-directory("apps/server")]
server-format:
    bun run format

# Update the server version
[group("server")]
[working-directory("apps/server")]
server-bump version:
    ./scripts/bump-version.sh "{{ version }}"

# Remove server-local generated dependencies
[group("server")]
[working-directory("apps/server")]
server-clean:
    rm -rf node_modules

# Build the CLI
[group("cli")]
cli-build:
    cargo build --package pulse

# Build the release CLI
[group("cli")]
cli-release:
    cargo build --release --package pulse

# Format-check and test the CLI
[group("cli")]
cli-check:
    cargo fmt --check --package pulse
    cargo test --package pulse

# Run CLI tests
[group("cli")]
cli-test:
    cargo test --package pulse

# Format CLI sources
[group("cli")]
cli-format:
    cargo fmt --package pulse

# Install the release CLI to ~/.local/bin
[group("cli")]
cli-install: cli-release
    cp target/release/pulse ~/.local/bin/pulse

# Update the CLI version and root Cargo lockfile
[group("cli")]
cli-bump version:
    cd crates/pulse-cli && ./scripts/bump-version.sh "{{ version }}"

# Remove CLI build artifacts
[group("cli")]
cli-clean:
    cargo clean

_cli-e2e service:
    docker compose -f crates/pulse-cli/e2e/docker-compose.yml up --build --abort-on-container-exit "{{ service }}"

# Build CLI provider E2E images
[group("cli")]
cli-e2e-build:
    docker compose -f crates/pulse-cli/e2e/docker-compose.yml build

# Stop CLI provider E2E services
[group("cli")]
cli-e2e-down:
    docker compose -f crates/pulse-cli/e2e/docker-compose.yml down --remove-orphans

[group("cli")]
cli-e2e-claude: (_cli-e2e "e2e")

[group("cli")]
cli-e2e-claude-tools: (_cli-e2e "e2e-cc-tools")

[group("cli")]
cli-e2e-opencode: (_cli-e2e "e2e-opencode")

[group("cli")]
cli-e2e-opencode-tools: (_cli-e2e "e2e-oc-tools")

[group("cli")]
cli-e2e-codex: (_cli-e2e "e2e-codex")

[group("cli")]
cli-e2e-codex-tools: (_cli-e2e "e2e-codex-tools")

# Run all CLI provider E2E suites
[group("cli")]
cli-e2e: cli-e2e-claude cli-e2e-claude-tools cli-e2e-opencode cli-e2e-opencode-tools cli-e2e-codex cli-e2e-codex-tools

# Build, typecheck, and test the TypeScript SDK
[group("typescript-sdk")]
sdk-ts-check:
    bun run --cwd sdks/typescript build
    bun run --cwd sdks/typescript typecheck
    bun test --cwd sdks/typescript tests/pricing.test.ts tests/sdk-spans.test.ts tests/transport.test.ts

# Format TypeScript SDK sources
[group("typescript-sdk")]
sdk-ts-format:
    bun run --cwd sdks/typescript format

# Create a project API key using ADMIN_KEY
[group("typescript-sdk")]
sdk-ts-create-api-key:
    bun run --cwd sdks/typescript create-api-key

# Update the TypeScript SDK version
[group("typescript-sdk")]
sdk-ts-bump version:
    cd sdks/typescript && ./scripts/bump-version.sh "{{ version }}"

# Test the Python SDK
[group("python-sdk")]
sdk-py-check:
    cd sdks/python && uv run --python 3.12 --frozen pytest -c /dev/null --rootdir=. -p no:cacheprovider tests/test_spans.py tests/test_transport.py

# Update the Python SDK version
[group("python-sdk")]
sdk-py-bump version:
    cd sdks/python && ./scripts/bump-version.sh "{{ version }}"
