#!/bin/sh
set -eu

if ! command -v bun >/dev/null 2>&1; then
  printf '%s\n' "Bun fehlt. Installiere Bun mit:"
  printf '%s\n' "curl -fsSL https://bun.com/install | bash"
  exit 1
fi

exec bun run src/server.ts
