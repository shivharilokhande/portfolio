# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------
# Portfolio web — multi-stage build.
#
#   Stage 1 (builder): npm install + Vite production build.
#   Stage 2 (runtime): nginx serving the built /dist plus /api/* reverse-
#                       proxy to the api service on the docker network.
#
# The upstream host is passed via API_UPSTREAM at container start
# (defaults to http://api:9090). See nginx.conf.template for the
# envsubst step at container boot.
# ---------------------------------------------------------------

FROM node:20-bookworm-slim AS builder
WORKDIR /build

# npm ci wants an exact lockfile. Copy just the manifests first so
# node_modules gets cached across code edits.
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    (npm ci || npm install)

COPY . .
RUN npm run build

# ---------------------------------------------------------------
FROM nginx:1.27-alpine
COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

ENV API_UPSTREAM=http://api:9090
EXPOSE 80

# nginx image already runs envsubst on /etc/nginx/templates/*.template
# using the container env vars — no custom entrypoint needed.
