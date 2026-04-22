# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile

COPY . .

ARG NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
ARG SERVER_INTERNAL_API_BASE_URL=http://server:4000

ENV NEXT_PUBLIC_APP_ORIGIN=${NEXT_PUBLIC_APP_ORIGIN}
ENV SERVER_INTERNAL_API_BASE_URL=${SERVER_INTERNAL_API_BASE_URL}

RUN pnpm --filter web build

CMD ["corepack", "pnpm", "--filter", "web", "start"]
