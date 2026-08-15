# syntax=docker/dockerfile:1.7

FROM node:24.11.0-alpine@sha256:f36fed0b2129a8492535e2853c64fbdbd2d29dc1219ee3217023ca48aebd3787 AS build

WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml project.inlang .npmrc ./
COPY packages/content-core/package.json packages/content-core/package.json
COPY packages/lesson-export-core/package.json packages/lesson-export-core/package.json
COPY packages/shiki-core/package.json packages/shiki-core/package.json
COPY packages/site-core/package.json packages/site-core/package.json

RUN --mount=type=cache,id=dibs-pnpm-store,target=/pnpm/store \
    --mount=type=secret,id=npmrc,target=/root/.npmrc,required=true \
    pnpm config set store-dir /pnpm/store && pnpm install --frozen-lockfile

COPY . .

RUN --mount=type=cache,id=dibs-pnpm-store,target=/pnpm/store \
    pnpm build

FROM nginxinc/nginx-unprivileged:1.29-alpine@sha256:0c79d56aee561a1d81c63f00eee5fb5fe29279560cdc55e91425133104c7fbe6 AS runtime

ARG SOURCE_REVISION=unknown
ARG IMAGE_VERSION=unknown

LABEL org.opencontainers.image.title="DIBS static website" \
      org.opencontainers.image.description="Static DIBS course website" \
      org.opencontainers.image.version="${IMAGE_VERSION}" \
      org.opencontainers.image.revision="${SOURCE_REVISION}" \
      org.opencontainers.image.source="https://github.com/r8vnhill/dibs-astro" \
      org.opencontainers.image.licenses="BSD-2-Clause"

COPY --from=build /app/dist/ /usr/share/nginx/html/
COPY docker/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
