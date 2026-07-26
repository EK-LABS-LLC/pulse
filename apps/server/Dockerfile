FROM oven/bun:1.3.5-alpine AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY apps/docs/package.json ./apps/docs/
COPY packages/api-contracts/package.json ./packages/api-contracts/
COPY sdks/typescript/package.json ./sdks/typescript/
RUN bun install --frozen-lockfile \
    --filter './apps/server' \
    --filter './apps/dashboard' \
    --filter './packages/api-contracts'

COPY . .
RUN bun run --cwd apps/server build:pulse

FROM oven/bun:1.3.5-alpine AS runtime
WORKDIR /app

COPY --from=build /app/apps/server/dist/pulse-server /usr/local/bin/pulse-server
COPY --from=build /app/apps/server/dist/dashboard /app/dashboard

ENV DASHBOARD_DIST_DIR=/app/dashboard

EXPOSE 3000
VOLUME ["/root/.pulse"]

ENTRYPOINT ["pulse-server"]
