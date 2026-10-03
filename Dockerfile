FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build

FROM nginx:1.31-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/*/browser/ /usr/share/nginx/html/
EXPOSE 80
# 127.0.0.1, not localhost: nginx listens on IPv4 only and localhost resolves to ::1 in this image.
HEALTHCHECK --interval=30s --timeout=3s CMD wget --spider -q http://127.0.0.1/ || exit 1
