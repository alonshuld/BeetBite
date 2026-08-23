import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { execSync, spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';
import { chromium } from '@playwright/test';
import { seedBaseline } from './fixtures/seed';

const BACKEND_DIR = path.resolve(__dirname, '../backend');
const FRONTEND_DIR = path.resolve(__dirname, '../frontend');
const AUTH_DIR = path.resolve(__dirname, 'playwright/.auth');
const STATE_FILE = path.resolve(__dirname, '.test-state.json');

const E2E_USERNAME = 'e2e-admin';
const E2E_PASSWORD = 'E2eTest1234!';
const JWT_SECRET = 'e2e-test-jwt-secret-minimum-32-chars-long';
const BACKEND_PORT = 3001;
const FRONTEND_PORT = 5174;

declare global {
  var __E2E_CONTAINER__: StartedPostgreSqlContainer;

  var __E2E_BACKEND__: ChildProcess;

  var __E2E_FRONTEND__: ChildProcess;
}

async function waitForUrl(url: string, timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 401 || res.status === 404) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

/**
 * Resolves an executable Chromium for Puppeteer, preferring an explicit
 * PUPPETEER_EXECUTABLE_PATH and otherwise falling back to the browser
 * Playwright installed for this suite.
 *
 * Fails here rather than letting the first PDF test die on a launch timeout
 * with nothing useful in the report.
 */
function resolveChromiumPath(): string {
  const explicit = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (explicit && fs.existsSync(explicit)) return explicit;

  const playwrightChromium = chromium.executablePath();
  if (playwrightChromium && fs.existsSync(playwrightChromium)) {
    return playwrightChromium;
  }

  throw new Error(
    'No Chromium executable found for Puppeteer. Run `pnpm --filter e2e exec ' +
      'playwright install chromium --with-deps`, or set ' +
      'PUPPETEER_EXECUTABLE_PATH to a Chromium binary.',
  );
}

export default async function globalSetup(): Promise<void> {
  // 1. Start PostgreSQL container
  console.log('[e2e] Starting PostgreSQL container…');
  const container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('e2e_db')
    .withUsername('e2e_user')
    .withPassword('e2e_password')
    .start();

  const databaseUrl = container.getConnectionUri();
  global.__E2E_CONTAINER__ = container;

  // 2. Run migrations
  console.log('[e2e] Running migrations…');
  execSync('pnpm prisma migrate deploy', {
    cwd: BACKEND_DIR,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  // 3. Seed admin user via Prisma
  console.log('[e2e] Seeding admin user + company settings…');
  // Import backend's generated Prisma client
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require(
    path.join(BACKEND_DIR, 'src/generated/client'),
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require('@prisma/adapter-pg');

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10);
  await prisma.user.upsert({
    where: { username: E2E_USERNAME },
    update: { passwordHash },
    create: { username: E2E_USERNAME, passwordHash },
  });

  // Company settings must exist, otherwise OnboardingGate redirects every
  // authenticated route to /onboarding and no page under test ever renders.
  // The PDF export also requires name + companyNumber, and a VAT rate it can
  // resolve for the month — without one every export 400s. Both live in
  // fixtures/seed.ts, which db.fixture.ts restores from after each test.
  await seedBaseline(prisma);
  await prisma.$disconnect();

  // 4. Build backend (ensures dist/main.js exists; clears stale tsbuildinfo first)
  console.log('[e2e] Building backend…');
  const tsbuildinfo = path.join(BACKEND_DIR, 'tsconfig.build.tsbuildinfo');
  if (fs.existsSync(tsbuildinfo)) fs.unlinkSync(tsbuildinfo);
  execSync('pnpm build', {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
  });

  // 5. Start backend (production build — stable, no file watchers)
  console.log('[e2e] Starting backend…');

  // The PDF export launches headless Chromium through Puppeteer inside the
  // backend. Rather than have Puppeteer download a second browser, point it at
  // the one Playwright already installed for this suite — so `pnpm install` can
  // skip Puppeteer's own download entirely (see e2e.yml).
  const chromiumPath = resolveChromiumPath();
  console.log(`[e2e] Puppeteer will use Chromium at ${chromiumPath}`);

  const backendEnv: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    JWT_SECRET,
    PORT: String(BACKEND_PORT),
    NODE_ENV: 'development',
    PUPPETEER_EXECUTABLE_PATH: chromiumPath,
  };

  const backend = spawn('node', ['dist/main'], {
    cwd: BACKEND_DIR,
    env: backendEnv,
    stdio: 'pipe',
    shell: false,
    // Own process group, so teardown can signal the whole tree at once.
    detached: process.platform !== 'win32',
  });
  global.__E2E_BACKEND__ = backend;

  backend.stdout?.on('data', (d: Buffer) => {
    if (process.env.E2E_VERBOSE) process.stdout.write(d);
  });
  backend.stderr?.on('data', (d: Buffer) => {
    process.stderr.write(d);
  });

  await waitForUrl(`http://localhost:${BACKEND_PORT}/api/v1/docs`, 30000);
  console.log('[e2e] Backend ready.');

  // 6. Start frontend (Vite proxies /api to BACKEND_PORT)
  console.log('[e2e] Starting frontend…');
  const frontendEnv: NodeJS.ProcessEnv = {
    ...process.env,
  };

  const frontend = spawn(
    'pnpm',
    ['dev', '--port', String(FRONTEND_PORT), '--config', 'vite.config.e2e.ts'],
    {
      cwd: FRONTEND_DIR,
      env: frontendEnv,
      stdio: 'pipe',
      shell: process.platform === 'win32',
      // `pnpm dev` forks sh → vite, and signalling only the pnpm wrapper
      // orphans vite still holding :5174 — which makes the *next* local run
      // fail at every page.goto. Detaching puts the tree in one process group
      // that global-teardown can signal as a unit.
      detached: process.platform !== 'win32',
    },
  );
  global.__E2E_FRONTEND__ = frontend;

  frontend.stderr?.on('data', (d: Buffer) => {
    if (process.env.E2E_VERBOSE) process.stderr.write(d);
  });

  await waitForUrl(`http://localhost:${FRONTEND_PORT}`);
  console.log('[e2e] Frontend ready.');

  // 7. Verify backend auth endpoint directly before UI login
  const testLoginRes = await fetch(
    `http://localhost:${BACKEND_PORT}/api/v1/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: E2E_USERNAME, password: E2E_PASSWORD }),
    },
  );
  const testLoginBody = await testLoginRes.text();
  console.log(
    `[e2e] Direct API login test: ${testLoginRes.status} ${testLoginBody.slice(0, 200)}`,
  );

  // 8. Get auth token and create auth state file directly
  console.log('[e2e] Saving auth state…');
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Get token from direct API call (bypasses Vite proxy issues)
  const loginRes = await fetch(
    `http://localhost:${BACKEND_PORT}/api/v1/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: E2E_USERNAME, password: E2E_PASSWORD }),
    },
  );
  const loginData = (await loginRes.json()) as { accessToken: string };
  const token = loginData.accessToken;

  // Create auth state file with localStorage containing the token
  // This matches what the frontend expects: localStorage['beetbite.token'] = token
  const authState = {
    cookies: [],
    origins: [
      {
        origin: `http://localhost:${FRONTEND_PORT}`,
        localStorage: [
          {
            name: 'beetbite.token',
            value: token,
          },
        ],
      },
    ],
  };

  fs.writeFileSync(
    path.join(AUTH_DIR, 'user.json'),
    JSON.stringify(authState, null, 2),
  );

  console.log('[e2e] Auth state saved with token in localStorage');

  // 9. Write state for teardown
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({ backendPid: backend.pid, frontendPid: frontend.pid }),
  );

  // Expose env vars for fixtures
  process.env.E2E_DATABASE_URL = databaseUrl;

  console.log('[e2e] Global setup complete.');
}
