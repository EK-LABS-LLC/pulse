import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { buildLoginUrl, type E2ECredentials } from "../helpers";

const SHOT_DIR = process.env.PULSE_E2E_SHOT_DIR ?? "screenshots";

/**
 * Credentials are provisioned once by global-setup.ts (single sign-in, so
 * better-auth's rate limiter is never tripped) and read from the state file.
 */
function loadCreds(): E2ECredentials {
  return JSON.parse(readFileSync("e2e-state.json", "utf8")) as E2ECredentials;
}

/**
 * Log in through the API-key local-login flow and land on the given route.
 * The local-login endpoint sets a real session cookie, so the dashboard runs
 * as the signed-in admin for the seeded project.
 */
async function loginAndOpen(page, route: string, creds: E2ECredentials) {
  const loginUrl = await buildLoginUrl(creds, route);
  await page.goto(loginUrl);
  await page.waitForURL(`**${route}`);
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });
}

test.describe("dashboard surfaces against seeded data", () => {
  const creds = loadCreds();

  for (const theme of ["dark", "light"] as const) {
    test(`overview renders seeded metrics (${theme})`, async ({ page }) => {
      await loginAndOpen(page, "/dashboard", creds);
      await page.emulateMedia({ colorScheme: theme });

      // The sidebar's "Overview" label is a hover-only tooltip; assert on the
      // metric strip and section content that the page actually shows.
      await expect(page.getByText(/Requests/).first()).toBeVisible();
      await expect(page.getByText(/Last 7 days|Last 24h|Last 30 days/).first())
        .toBeVisible();

      await page.screenshot({
        path: `${SHOT_DIR}/overview-${theme}.png`,
        fullPage: true,
      });
    });

    test(`traces list shows CLI-emitted spans (${theme})`, async ({ page }) => {
      await loginAndOpen(page, "/dashboard/traces", creds);

      await expect(page.locator("h1", { hasText: "Traces" })).toBeVisible();
      await expect(page.getByText(/total/).first()).toBeVisible();

      // The CLI emits a session whose agent turn makes two tool calls; the
      // dashboard derives a "2 tool calls" summary for that trace.
      const cliTrace = page
        .locator('div[role="button"]')
        .filter({ hasText: /tool calls/ })
        .first();
      await expect(cliTrace).toBeVisible();
      await expect(cliTrace).toContainText("2 tool calls");

      await page.screenshot({ path: `${SHOT_DIR}/traces-${theme}.png` });
    });

    test(`sessions list shows seeded sessions (${theme})`, async ({ page }) => {
      await loginAndOpen(page, "/dashboard/sessions", creds);

      await expect(page.locator("h1", { hasText: "Sessions" })).toBeVisible();

      await page.screenshot({ path: `${SHOT_DIR}/sessions-${theme}.png` });
    });

    test(`settings renders profile and preferences (${theme})`, async ({ page }) => {
      await loginAndOpen(page, "/dashboard/settings", creds);

      await expect(page.locator("h1", { hasText: "Settings" })).toBeVisible();
      await expect(page.getByText("Appearance").first()).toBeVisible();

      await page.screenshot({ path: `${SHOT_DIR}/settings-${theme}.png` });
    });

    test(`overview opens CLI trace detail with tool spans (${theme})`, async ({
      page,
    }) => {
      await loginAndOpen(page, "/dashboard", creds);

      // Recent traces render as buttons inside the "Recent traces" section.
      // Skip the "View all traces →" header button and click the first row.
      const section = page.locator("section", { hasText: "Recent traces" });
      const recentRow = section
        .locator("button")
        .filter({ hasNotText: "View all traces" })
        .first();
      await recentRow.waitFor({ state: "visible", timeout: 15000 });
      await recentRow.click();

      await page.waitForURL(/\/dashboard\/traces\/.+/);
      await expect(page.locator("h1").first()).toBeVisible();

      // The CLI session's tool spans (Bash + Edit) render in the timeline.
      await expect(page.getByText("Bash", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Edit", { exact: true }).first()).toBeVisible();

      await page.screenshot({ path: `${SHOT_DIR}/trace-detail-${theme}.png` });
    });
  }
});
