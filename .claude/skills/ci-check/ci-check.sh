#!/usr/bin/env bash
# Runs what .vite-hooks/pre-commit and .github/workflows/ci.yml (+ e2e.yml on
# request) run, one step at a time, sized for the ~3.8 GB WSL dev box.
#
#   ci-check.sh                 all CI steps (no e2e)
#   ci-check.sh fix             auto-fix formatting + lint first, then all steps
#   ci-check.sh lint test-backend   only the named steps, in the given order
#
# Steps: precommit format lint test-backend test-frontend migrations build e2e
#
# Safety rules (each one is here because breaking it has crashed WSL):
#   - never two heavy steps at once; no `pnpm -r` without --workspace-concurrency=1
#   - vitest always --maxWorkers=1
#   - every node process: capped heap, nice -n 19
#   - each step waits for enough free RAM first, and aborts if it never comes
set -uo pipefail

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
command -v pnpm >/dev/null || . "$NVM_DIR/nvm.sh" >/dev/null
export PUPPETEER_SKIP_DOWNLOAD=true
HEAP_MB=${HEAP_MB:-1536}
MIN_FREE_MB=${MIN_FREE_MB:-900}
PG_PORT=${PG_PORT:-5440}
PG_NAME=beetbite-ci-check-pg

ALL_STEPS=(precommit format lint test-backend test-frontend migrations build)
LOG_DIR=${LOG_DIR:-/tmp/beetbite-ci-check}
mkdir -p "$LOG_DIR"

run() { NODE_OPTIONS="--max-old-space-size=$HEAP_MB" nice -n 19 "$@"; }

free_mb() { awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo; }

wait_for_ram() {
  local tries=0
  while [ "$(free_mb)" -lt "$MIN_FREE_MB" ]; do
    if [ $tries -ge 12 ]; then
      echo "!! only $(free_mb) MB free (< $MIN_FREE_MB) after 60 s — aborting." >&2
      echo "!! Stop something heavy (dev server, Docker backend, browser tabs) and rerun." >&2
      return 1
    fi
    [ $tries -eq 0 ] && echo "   waiting for RAM ($(free_mb) MB free, need $MIN_FREE_MB)..."
    tries=$((tries + 1))
    sleep 5
  done
}

# Files changed on this branch vs main, plus staged + unstaged + untracked.
changed_files() {
  local base
  base=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || echo HEAD)
  {
    git diff --name-only --diff-filter=ACMR "$base"
    git ls-files --others --exclude-standard
  } | sort -u
}

# Same check as .vite-hooks/pre-commit (`vp check` on the staged files), but
# over every file this branch touches rather than only the staged ones — so
# whatever gets staged later passes.
step_precommit() {
  local files
  files=$(changed_files | grep -E '\.(ts|tsx|js|mjs)$' || true)
  # Deleted-in-worktree files can still show up in the diff list.
  files=$(for f in $files; do [ -f "$f" ] && echo "$f"; done)
  [ -z "$files" ] && return 0
  echo "-- $(echo "$files" | wc -l) files"
  echo "$files" | xargs env NODE_OPTIONS="--max-old-space-size=1024" nice -n 19 pnpm exec vp check
}

step_format() { run pnpm format:check; }

# lint:check = Oxlint over the whole workspace, type check included.
step_lint() { run pnpm lint:check; }

step_test-backend() { (cd apps/backend && run pnpm exec vp test run --project unit --maxWorkers=1); }

step_test-frontend() { (cd apps/frontend && run pnpm exec vp test run --passWithNoTests --maxWorkers=1); }

# CI replays every migration into an empty Postgres 17 and diffs against
# schema.prisma. Do the same on a throwaway container — never the dev DB.
step_migrations() {
  local rc
  docker rm -f "$PG_NAME" >/dev/null 2>&1
  docker run -d --name "$PG_NAME" -e POSTGRES_USER=ci -e POSTGRES_PASSWORD=ci -e POSTGRES_DB=ci \
    -p "$PG_PORT:5432" --memory=256m postgres:17-alpine >/dev/null || return 1
  for _ in $(seq 1 30); do
    docker exec "$PG_NAME" pg_isready -U ci -d ci >/dev/null 2>&1 && break
    sleep 1
  done
  DATABASE_URL="postgresql://ci:ci@localhost:$PG_PORT/ci" run pnpm --filter backend db:sync
  rc=$?
  docker rm -f "$PG_NAME" >/dev/null 2>&1
  return $rc
}

# vite build of the frontend is the hungriest step; give it a bit more heap.
step_build() { HEAP_MB=$((HEAP_MB > 2048 ? HEAP_MB : 2048)) run pnpm -r --workspace-concurrency=1 build; }

# Heaviest by far: Postgres testcontainer + built backend + Vite + Chromium.
# Only on explicit request; dev servers must be stopped first.
step_e2e() {
  if curl -sf -o /dev/null localhost:3000/api/v1/health || curl -sf -o /dev/null localhost:5173; then
    echo "!! dev stack is running on :3000/:5173 — stop it before e2e (RAM)." >&2
    return 1
  fi
  run pnpm --filter backend build || return 1
  TESTCONTAINERS_RYUK_DISABLED=true run pnpm test:e2e
}

fix() {
  echo "== fix: vp fmt, vp lint --fix"
  wait_for_ram || exit 1
  run pnpm format
  wait_for_ram || exit 1
  # `pnpm lint` also type-checks; failures here are reported by the lint step.
  run pnpm lint >/dev/null 2>&1 || true
  git status --short
}

steps=()
for arg in "$@"; do
  case $arg in
    fix) do_fix=1 ;;
    precommit | format | lint | test-backend | test-frontend | migrations | build | e2e) steps+=("$arg") ;;
    *) echo "unknown step: $arg (valid: fix ${ALL_STEPS[*]} e2e)" >&2; exit 2 ;;
  esac
done
[ ${#steps[@]} -eq 0 ] && steps=("${ALL_STEPS[@]}")
[ -n "${do_fix:-}" ] && fix

declare -A result
overall=0
for s in "${steps[@]}"; do
  echo
  echo "== $s  ($(free_mb) MB free)"
  if ! wait_for_ram; then result[$s]="ABORT (low RAM)"; overall=1; break; fi
  start=$SECONDS
  if "step_$s" >"$LOG_DIR/$s.log" 2>&1; then
    result[$s]="pass ($((SECONDS - start))s)"
  else
    result[$s]="FAIL ($((SECONDS - start))s) — $LOG_DIR/$s.log"
    overall=1
    tail -n 40 "$LOG_DIR/$s.log"
  fi
done

echo
echo "== summary"
for s in "${steps[@]}"; do printf '  %-14s %s\n' "$s" "${result[$s]:-skipped}"; done
exit $overall
