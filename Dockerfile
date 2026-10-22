# syntax=docker/dockerfile:1
# The image of ete.rgevrek.de: the Next.js standalone server with the books, the dictionary and the
# fonts (data/, public/). Built in CI (.github/workflows/ci.yml); configuration and secrets come from
# the environment (deploy/helm/ete).
ARG NODE_IMAGE=node:24-bookworm-slim

FROM ${NODE_IMAGE} AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 CI=1
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
# the image's unprivileged user (uid 1000); the chart enforces runAsNonRoot
USER 1000:1000
COPY --from=build --chown=1000:1000 /repo/.next/standalone ./
COPY --from=build --chown=1000:1000 /repo/.next/static ./.next/static
COPY --from=build --chown=1000:1000 /repo/public ./public
COPY --from=build --chown=1000:1000 /repo/data ./data
EXPOSE 3000
# the books and the dictionary take ~0.5 GB of heap
CMD ["node", "--max-old-space-size=768", "server.js"]
