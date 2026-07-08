FROM node:26-slim AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @megiddo/api build
RUN pnpm exec esbuild apps/api/src/server.ts --bundle --format=esm --platform=node --outfile=apps/api/dist/server.js

FROM node:26-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app /app

EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
