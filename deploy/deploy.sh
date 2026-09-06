#!/usr/bin/env bash
# Runs on the server as the deploy user. Shipped by .github/workflows/release.yml.
#
# A file rather than a script piped into `ssh bash -s`: several docker commands attach the
# caller's stdin to a container and read the rest of a piped script as data. The backend's first
# release lost half its deploy that way.
set -euo pipefail

TAG="${1:?tag required}"
GHCR_USER="${2:?github actor required}"
# The token arrives on stdin, never in argv: arguments are readable by any other process on the
# host through /proc.
IFS= read -r GHCR_TOKEN

printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

cd /srv/cairn
sed -i "s|^WEB_TAG=.*|WEB_TAG=${TAG}|" .env

# Only the web service: this repository must never restart the API or the database.
docker compose -f compose.prod.yaml pull web
# --wait: fail here when the container never turns healthy, rather than reporting success on a
# container Docker considers dead.
docker compose -f compose.prod.yaml up -d --wait --wait-timeout 120 web

docker logout ghcr.io
docker image prune -f
