#!/bin/sh
set -eu

if ! command -v bun >/dev/null 2>&1; then
  printf '%s\n' "Bun fehlt. Installiere Bun mit:"
  printf '%s\n' "curl -fsSL https://bun.com/install | bash"
  exit 1
fi

# Also load local configuration when launched outside a direnv-enabled shell.
if [ -f .envrc ]; then
  . ./.envrc
fi

exec bun run src/server.ts
