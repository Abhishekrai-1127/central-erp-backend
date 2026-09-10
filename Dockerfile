# FIX (perf): pin the pnpm version via `corepack prepare` instead of a bare
# `corepack enable`, so corepack resolves it locally instead of asking the
# registry which version to activate on every build.
ARG PNPM_VERSION=11.25.0

FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --ignore-scripts

COPY . .

RUN pnpm run build


FROM node:22-alpine AS production

ARG BUILD_NUMBER
ARG GIT_COMMIT
ARG GIT_BRANCH
ARG BUILD_TIME

ENV BUILD_NUMBER=$BUILD_NUMBER \
    GIT_COMMIT=$GIT_COMMIT \
    GIT_BRANCH=$GIT_BRANCH \
    BUILD_TIME=$BUILD_TIME

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate


COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder /app/dist ./dist

# Run as non-root for a smaller attack surface
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3000

CMD ["node", "dist/main.js"]