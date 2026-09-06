# 127.0.0.1 and not localhost: `listen 80` binds IPv4 only, while localhost resolves to ::1 in
# this image, so the check failed against a server that was serving every request correctly.

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build

FROM nginx:1.29-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/*/browser/ /usr/share/nginx/html/
EXPOSE 80
# 127.0.0.1 and not localhost: `listen 80` binds IPv4 only, while localhost resolves to ::1 in
# this image, so the check reported a dead container while nginx served every request correctly.
HEALTHCHECK --interval=30s --timeout=3s CMD wget --spider -q http://127.0.0.1/ || exit 1
