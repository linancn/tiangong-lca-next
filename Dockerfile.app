# syntax=docker/dockerfile:1.7

FROM node:24.19.0-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43

WORKDIR /app

RUN corepack enable \
    && corepack install --global pnpm@11.24.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 8000

CMD ["pnpm", "start"]
