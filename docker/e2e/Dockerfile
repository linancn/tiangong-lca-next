# syntax=docker/dockerfile:1.7

ARG PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e
ARG NODE_IMAGE=node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e
FROM ${NODE_IMAGE} AS pinned-node
FROM ${PLAYWRIGHT_IMAGE} AS dependencies

ARG E2E_FRONTEND_ENV=main

ENV CI=true \
    HOME=/root \
    XDG_CACHE_HOME=/root/.cache \
    REACT_APP_ENV=${E2E_FRONTEND_ENV} \
    UMI_ENV=prod

WORKDIR /app

COPY --from=pinned-node /usr/local/bin/node /usr/local/bin/node

RUN corepack enable \
    && test "$(node --version)" = "v24.20.0" \
    && corepack install --global pnpm@11.25.0

# The lockfile layer is intentionally before the candidate archive. Docker can therefore reuse
# the exact pnpm dependency graph when application commits change without changing the lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=tiangong-next-e2e-pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --store-dir=/root/.local/share/pnpm/store

FROM dependencies AS candidate

RUN mkdir -p /opt/tiangong-e2e
COPY candidate-manifest.json /opt/tiangong-e2e/candidate-manifest.json
COPY environment.json /opt/tiangong-e2e/environment.json
COPY verify-build-input.cjs /tmp/verify-build-input.cjs
COPY candidate.tar /tmp/tiangong-candidate.tar
RUN node /tmp/verify-build-input.cjs \
    && tar -xf /tmp/tiangong-candidate.tar -C /app \
    && rm /tmp/tiangong-candidate.tar \
    && rm /tmp/verify-build-input.cjs \
    && pnpm postinstall \
    && pnpm build

ENTRYPOINT ["node", "--import", "tsx", "scripts/e2e/container-runner.ts"]
