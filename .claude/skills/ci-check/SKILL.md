---
name: ci-check
description: Make BeetBite pass the Vite+ pre-commit hook and GitHub CI (format, lint + typecheck, backend + frontend Vitest, migrations-vs-schema, build; e2e on request) — run them locally one at a time within the dev box's ~3.8 GB RAM, fix what fails, re-run until green. Use before committing/pushing, when asked "make CI pass", "fix lint/tests", "will this pass CI", or after a CI failure.
---

# Make BeetBite pass pre-commit + CI

The dev box is WSL2 with **~3.8 GB RAM, 1 GB swap**. Running the test suites and checks in parallel — or a test runner without a worker cap — has crashed WSL several times. All checks go through `ci-check.sh`, which runs strictly one step at a time, `nice -n 19`, with a capped Node heap, single-worker test runners, and a free-RAM gate before every step.

## Hard rules

- **Never** run root `pnpm test`, bare `vp test`/`vitest`, or two check commands in parallel (no `&`, no parallel Bash calls, no background check while another runs). Use the script.
- Run the script in the **foreground**, one invocation at a time. Don't start the dev server, Playwright, or Docker builds while it runs.
- To check one spec while fixing: `cd apps/backend && nice -n 19 pnpm exec vp test run --project unit --maxWorkers=1 <path/to/file.spec.ts>` or `cd apps/frontend && nice -n 19 pnpm exec vp test run --maxWorkers=1 <path>`.
- If the script aborts with low RAM, tell the user what's using memory (`ps aux --sort=-rss | head`) and ask before killing anything that's theirs (dev server, Docker containers).
- Never "fix" CI by weakening it: no `--no-verify`, no `oxlint-disable`/`eslint-disable`, `@ts-ignore`, `.skip`, deleting tests, or loosening configs, unless the user agrees. Fix the code.

## What CI runs (keep in sync with `.github/workflows/`)

| Step | Mirrors | Command in script |
| --- | --- | --- |
| `precommit` | `.vite-hooks/pre-commit` | `vp check` on every file the branch changes (vs `origin/main`, plus staged/unstaged/untracked) |
| `format` | ci.yml *Format, lint & typecheck* | `pnpm format:check` (`vp fmt --check`) |
| `lint` | ci.yml *Format, lint & typecheck* | `pnpm lint:check` (`vp lint`: Oxlint + type check over the whole workspace) |
| `test-backend` | ci.yml *Backend unit tests* | `vp test run --project unit --maxWorkers=1` |
| `test-frontend` | ci.yml *Frontend unit tests* | `vp test run --maxWorkers=1` |
| `migrations` | ci.yml *Migrations match schema* | `db:sync` against a throwaway `postgres:17-alpine` on `:5440` (never the dev DB) |
| `build` | ci.yml *Build* | `pnpm -r --workspace-concurrency=1 build` |
| `e2e` | e2e.yml | backend build + `pnpm test:e2e` — **opt-in only** |

If a workflow changes, update the table and the script together.

## Workflow

Prefix every Bash call (node/pnpm come from nvm):

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh" >/dev/null; cd /home/alonsd/dev/BeetBite
```

1. **Auto-fix + full run** (timeout 600000 — the full run takes several minutes):
   ```bash
   bash .claude/skills/ci-check/ci-check.sh fix
   ```
   `fix` runs `pnpm format` (`vp fmt`) and `pnpm lint` (`vp lint --fix`) first, then every CI step. Show the user the `git status` it prints — auto-fix may touch files outside the change.
2. **Read failures.** The summary lists each step; a failing step prints its last 40 lines and keeps a full log at `/tmp/beetbite-ci-check/<step>.log`. Read the log, not a re-run.
3. **Fix the cause** in code. Typical fixes:
   - `format` / `precommit` — `pnpm format` (or `pnpm exec vp fmt <file>`).
   - `lint` — lint errors need real code fixes; type errors after a backend DTO change usually mean regenerating frontend API types: `pnpm --filter frontend codegen` (needs backend running — see the `run-dev` skill).
   - `test-*` — run the single failing spec as above until green. Spurious failures in untouched files under memory pressure are not regressions: re-run that spec alone before chasing them.
   - `migrations` — `schema.prisma` changed without a migration: `cd apps/backend && pnpm exec prisma migrate dev --name <change>` (against the dev DB; ask first if it would reset data).
   - `build` — usually a missing Prisma client (`pnpm --filter backend exec prisma generate`).
4. **Re-run only what failed**, in order: `bash .claude/skills/ci-check/ci-check.sh lint test-backend`.
5. **Final full run** (no args) once everything is fixed, so a fix in one step hasn't broken another. Report the summary table to the user verbatim; say plainly if anything still fails.

## E2E

Only when the user asks, or the change touches flows the Playwright suite covers and the user agrees. It needs Docker and ~2 GB free. Stop the dev stack first (the script refuses if `:3000`/`:5173` answer), then:

```bash
bash .claude/skills/ci-check/ci-check.sh e2e
```

## Tuning knobs (env vars)

`HEAP_MB` (default 1536; build uses ≥2048), `MIN_FREE_MB` (default 900 — RAM required before each step), `PG_PORT` (default 5440), `LOG_DIR` (default `/tmp/beetbite-ci-check`). Lower `HEAP_MB` rather than raising `MIN_FREE_MB` if a step OOMs.
