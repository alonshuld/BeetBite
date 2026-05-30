import type { Page } from "@playwright/test";

const TOKEN_KEY = "beetbite.token";
const FAKE_TOKEN = "playwright-test-token";

export async function injectToken(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, token }) => localStorage.setItem(key, token),
    { key: TOKEN_KEY, token: FAKE_TOKEN },
  );
}
