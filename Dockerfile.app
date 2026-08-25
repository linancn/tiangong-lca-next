# syntax=docker/dockerfile:1.7

FROM node:24.19.0-alpine

WORKDIR /app

RUN corepack enable \
    && corepack install --global pnpm@11.23.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 8000

CMD ["pnpm", "start"]
