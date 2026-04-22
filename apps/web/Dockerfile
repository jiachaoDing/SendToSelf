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

ENV SERVER_INTERNAL_API_BASE_URL=http://server:4000

RUN pnpm --filter web build

CMD ["corepack", "pnpm", "--filter", "web", "start"]
