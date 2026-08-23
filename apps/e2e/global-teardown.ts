import * as fs from 'fs';
import * as path from 'path';

const STATE_FILE = path.resolve(__dirname, '.test-state.json');

/**
 * Signals a whole process group, falling back to the single process.
 *
 * `pnpm dev` forks sh → vite, so signalling just the recorded pid leaves vite
 * running and holding :5174. global-setup spawns both servers detached, which
 * makes each one a group leader whose group id equals its pid — so a negative
 * pid reaches the children too.
 */
function killProcess(pid: number | undefined): void {
  if (!pid) return;
  try {
    process.kill(-pid, 'SIGTERM');
    return;
  } catch {
    // Not a group leader (or already gone) — fall through to the plain kill.
  }
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // process may already be gone
  }
}

export default async function globalTeardown(): Promise<void> {
  // Kill backend and frontend using global references (same process as setup)
  killProcess(global.__E2E_BACKEND__?.pid);
  killProcess(global.__E2E_FRONTEND__?.pid);

  // Fallback: read PIDs from state file
  if (fs.existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as {
        backendPid?: number;
        frontendPid?: number;
      };
      killProcess(state.backendPid);
      killProcess(state.frontendPid);
      fs.unlinkSync(STATE_FILE);
    } catch {
      // best-effort
    }
  }

  // Stop PostgreSQL container (ryuk will clean it too, but be explicit)
  if (global.__E2E_CONTAINER__) {
    await global.__E2E_CONTAINER__.stop();
  }

  console.log('[e2e] Global teardown complete.');
}
