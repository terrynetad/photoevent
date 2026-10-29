import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import { createServer } from "node:net";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const isolatedRoot = mkdtempSync(
  path.join(os.tmpdir(), "photoevent-model-profile-mock-"),
);
const excludedNames = new Set([
  ".git",
  ".next",
  "node_modules",
  "test-results",
]);
const playwrightArgs = process.argv.slice(2);
const previewMode = playwrightArgs.includes("--preview");
if (
  playwrightArgs.length > 1 ||
  playwrightArgs.some(
    (argument) => argument !== "--headed" && argument !== "--preview",
  )
) {
  throw new Error("Use at most one supported flag: --headed or --preview.");
}

async function findAvailablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Could not determine an available local test port.");
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

function includeCopyEntry(sourcePath) {
  const name = path.basename(sourcePath);
  return !excludedNames.has(name) && !name.startsWith(".env");
}

function safeEnvironment(port) {
  const names = [
    "PATH",
    "PATHEXT",
    "SystemRoot",
    "WINDIR",
    "TEMP",
    "TMP",
    "LOCALAPPDATA",
    "APPDATA",
    "USERPROFILE",
    "COMSPEC",
  ];
  const environment = Object.fromEntries(
    names
      .filter((name) => process.env[name])
      .map((name) => [name, process.env[name]]),
  );
  environment.NEXT_PUBLIC_SUPABASE_URL =
    "https://model-profile-mock.invalid";
  environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
    "mock-publishable-key-not-a-secret";
  environment.NEXT_TELEMETRY_DISABLED = "1";
  environment.MOCK_UI_PORT = String(port);
  return environment;
}

let result;
try {
  cpSync(projectRoot, isolatedRoot, {
    recursive: true,
    filter: includeCopyEntry,
  });

  const port = await findAvailablePort();
  const environment = safeEnvironment(port);
  const install = spawnSync(
    environment.COMSPEC ?? "cmd.exe",
    ["/d", "/s", "/c", "npm ci --prefer-offline"],
    {
      cwd: isolatedRoot,
      env: environment,
      stdio: "inherit",
    },
  );
  if (install.error) throw install.error;
  if (install.status !== 0) {
    result = install;
  } else {
    const testArgs = previewMode
      ? ["--headed", "--grep=manual headed mock preview"]
      : playwrightArgs;
    result = spawnSync(
      process.execPath,
      [
        path.join(
          isolatedRoot,
          "node_modules",
          "@playwright",
          "test",
          "cli.js",
        ),
        "test",
        "--config=playwright.config.ts",
        ...testArgs,
      ],
      {
        cwd: isolatedRoot,
        env: environment,
        stdio: "inherit",
      },
    );
  }
  if (result?.error) throw result.error;
  const screenshotSource = path.join(
    isolatedRoot,
    "test-results",
    "mock-ui-screenshots",
  );
  if (result?.status === 0 && existsSync(screenshotSource)) {
    const screenshotTarget = path.join(
      projectRoot,
      "artifacts",
      "mock-ui-screenshots",
    );
    mkdirSync(screenshotTarget, { recursive: true });
    for (const filename of [
      "model-profile-desktop.png",
      "model-profile-mobile.png",
      "model-admin-desktop.png",
      "model-admin-mobile.png",
    ]) {
      copyFileSync(
        path.join(screenshotSource, filename),
        path.join(screenshotTarget, filename),
      );
    }
  }
} finally {
  rmSync(isolatedRoot, { recursive: true, force: true });
}

process.exitCode = result?.status ?? 1;
