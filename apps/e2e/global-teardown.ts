import * as fs from 'fs';
import * as path from 'path';

const STATE_FILE = path.resolve(__dirname, '.test-state.json');

function killProcess(pid: number | undefined): void {
  if (!pid) return;
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // process may already be gone
  }
}

export default async function globalTeardown(): Promise<void> {
  // Kill backend and frontend using global references (same process as setup)
  if (global.__E2E_BACKEND__) {
    global.__E2E_BACKEND__.kill('SIGTERM');
  }
  if (global.__E2E_FRONTEND__) {
    global.__E2E_FRONTEND__.kill('SIGTERM');
  }

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
