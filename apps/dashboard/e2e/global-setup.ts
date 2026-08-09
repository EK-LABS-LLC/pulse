import { bootstrap } from "./helpers";

/**
 * Runs once for the whole test run (single worker). Bootstraps the seeded
 * project + API key and writes credentials to a state file the tests read.
 * Keeping this to one sign-in avoids better-auth's in-memory rate limiter.
 */
export default async function globalSetup() {
  const creds = await bootstrap();
  await import("node:fs").then((fs) =>
    fs.promises.writeFile("e2e-state.json", JSON.stringify(creds, null, 2)),
  );
}
