# syntax=docker/dockerfile:1.7

ARG PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v1.61.1-noble@sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48
FROM ${PLAYWRIGHT_IMAGE} AS dependencies

ENV CI=true \
    HOME=/root \
    XDG_CACHE_HOME=/root/.cache \
    npm_config_cache=/root/.npm \
    REACT_APP_ENV=main \
    UMI_ENV=prod

WORKDIR /app

# The lockfile layer is intentionally before the candidate archive. Docker can therefore reuse
# the exact npm dependency tree when application commits change without changing package-lock.
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=tiangong-next-e2e-npm,target=/root/.npm \
    npm ci --ignore-scripts --no-audit --no-fund

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
    && npm run postinstall \
    && npm run build

ENTRYPOINT ["node", "--import", "tsx", "scripts/e2e/container-runner.ts"]
