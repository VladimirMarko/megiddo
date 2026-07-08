FROM node:26-slim AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps ./apps
COPY packages ./packages

ARG VITE_API_GATEWAY_BASE_URL=http://localhost:3000
ENV VITE_API_GATEWAY_BASE_URL=$VITE_API_GATEWAY_BASE_URL

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @megiddo/frontend build

FROM nginx:1.29-alpine AS runtime

COPY deploy/containers/frontend.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80
