# syntax=docker/dockerfile:1.7

FROM node:24.20.0-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf

WORKDIR /app

RUN corepack enable \
    && corepack install --global pnpm@11.25.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 8000

CMD ["pnpm", "start"]
