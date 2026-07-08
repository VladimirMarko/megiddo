FROM node:26-slim AS builder

WORKDIR /app
RUN npm install --global pnpm@11.9.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @megiddo/identity build
RUN pnpm exec esbuild apps/identity/src/server.ts --bundle --format=esm --platform=node --outfile=apps/identity/dist/server.js

FROM node:26-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app /app

EXPOSE 3002
CMD ["node", "apps/identity/dist/server.js"]
