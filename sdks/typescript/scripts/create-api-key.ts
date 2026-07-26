/**
 * Helper script to create a new project/API key via the trace-service admin API.
 *
 * Usage:
 *   ADMIN_KEY=dev-admin-key \
 *   TRACE_SERVICE_URL=http://localhost:3000 \
 *   PROJECT_NAME="My SDK Project" \
 *   bun run scripts/create-api-key.ts
 *
 * You can also pass the project name as CLI args:
 *   bun run scripts/create-api-key.ts "My SDK Project"
 */

const ADMIN_KEY = process.env.ADMIN_KEY ?? process.env.TRACE_SERVICE_ADMIN_KEY;
const rawBaseUrl = process.env.TRACE_SERVICE_URL && process.env.TRACE_SERVICE_URL.trim().length > 0
  ? process.env.TRACE_SERVICE_URL
  : undefined;
const BASE_URL = (rawBaseUrl ?? "http://localhost:3000").replace(/\/$/, "");

if (!ADMIN_KEY) {
  console.error("❌ ADMIN_KEY environment variable is required.");
  process.exit(1);
}

function resolveProjectName(): string {
  const cliName = process.argv.slice(2).join(" ").trim();
  const envName = process.env.PROJECT_NAME?.trim();

  if (cliName) return cliName;
  if (envName) return envName;

  return `Pulse SDK ${new Date().toISOString()}`;
}

async function createProject(): Promise<void> {
  const name = resolveProjectName();
  console.log(`📡 Creating project "${name}" via ${BASE_URL}/admin/projects`);

  const response = await fetch(`${BASE_URL}/admin/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": ADMIN_KEY!,
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`❌ Failed to create project (status ${response.status}). Response: ${text}`);
    process.exit(1);
  }

  const data = (await response.json()) as {
    projectId: string;
    apiKey: string;
    name: string;
  };

  console.log("✅ Project created successfully!");
  console.log(`   Name: ${data.name}`);
  console.log(`   Project ID: ${data.projectId}`);
  console.log("   API Key (save this now, it is only shown once):");
  console.log(`   ${data.apiKey}`);
  console.log("");
  console.log("Next step: export this key so the SDK can report traces, e.g.");
  console.log(`   export PULSE_API_KEY=${data.apiKey}`);
}

createProject().catch((error) => {
  console.error("❌ Unexpected error creating project:", error);
  process.exit(1);
});
