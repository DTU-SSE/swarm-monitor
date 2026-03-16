#!/usr/bin/env bash

set -euo pipefail

cmd=${1:-}

if [ -z "$cmd" ] || ! [ -f "/app/bin/$cmd" ]; then
  echo "Available commands:"
  ls /app/bin
  exit 1
fi

shift

exec "/app/bin/$cmd" "$@"