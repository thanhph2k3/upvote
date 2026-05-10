#!/usr/bin/env sh
set -eu

export DOCKER_IMAGE_TAG="${DOCKER_IMAGE_TAG:-$(date +%Y%m%d%H%M%S)}"

echo "Building Docker images with tag: ${DOCKER_IMAGE_TAG}"
docker compose up --build "$@"
