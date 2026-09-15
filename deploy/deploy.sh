#!/usr/bin/env bash
# Runs on the server as the deploy user. Shipped by .github/workflows/deploy.yml.
#
# A file rather than a script piped into `ssh bash -s`: several docker commands attach the
# caller's stdin to a container and read the rest of a piped script as data.
set -euo pipefail

TAG="${1:?tag required}"
GHCR_USER="${2:?github actor required}"
# The token arrives on stdin, never in argv: arguments are readable through /proc.
IFS= read -r GHCR_TOKEN

cd /srv/cairn

# The backend's deploy edits the same .env, and GitHub concurrency groups do not span repositories.
exec 9> /srv/cairn/.deploy.lock
flock -w 600 9 || { echo "deploy lock still held after 600 s" >&2; exit 1; }

printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
trap 'docker logout ghcr.io > /dev/null || true' EXIT

sed -i "s|^WEB_TAG=.*|WEB_TAG=${TAG}|" .env

# Only the web service: this repository must never restart the API or the database.
docker compose -f compose.prod.yaml pull web
docker compose -f compose.prod.yaml up -d --wait --wait-timeout 120 web

# `prune -f` only removes untagged images, and every deploy leaves a tagged one behind.
docker image ls --format '{{.Repository}}:{{.Tag}}' \
  | grep -E '^ghcr\.io/joanroucoux/cairn-web:' \
  | grep -vE ":${TAG}\$" \
  | xargs -r docker image rm || true
docker image prune -f
