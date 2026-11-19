import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

type LayerId = "unit" | "contract" | "integration" | "visual" | "desktop";

interface LayerDefinition {
  readonly id: LayerId;
  readonly command: string;
  readonly args: readonly string[];
}

interface LayerResult {
  readonly id: LayerId;
  readonly status: "pass" | "fail";
  readonly childExitCode: number;
}

const root = resolve(import.meta.dirname, "..");
const vitest = process.env.SPECTRAFORM_VITEST_BIN ?? resolve(root, "node_modules/.bin/vitest");
const playwright =
  process.env.SPECTRAFORM_PLAYWRIGHT_BIN ?? resolve(root, "node_modules/.bin/playwright");
const layers: readonly LayerDefinition[] = [
  {
    id: "unit",
    command: process.execPath,
    args: ["--test", "tests/unit/render-graph.test.ts"],
  },
  {
    id: "contract",
    command: vitest,
    args: ["run", "tests/contracts/foundation-smoke.test.ts", "--config", "vitest.config.ts"],
  },
  {
    id: "integration",
    command: vitest,
    args: ["run", "tests/integration/foundation-smoke.test.ts", "--config", "vitest.config.ts"],
  },
  {
    id: "visual",
    command: vitest,
    args: ["run", "tests/visual/foundation-smoke.test.ts", "--config", "vitest.config.ts"],
  },
  {
    id: "desktop",
    command: playwright,
    args: ["test", "tests/e2e/foundation-desktop.spec.ts", "--config", "playwright.config.ts"],
  },
] as const;

const requestedLayer = readLayerArgument("--layer");
const probeLayer = readLayerArgument("--probe-failure");
const selected = probeLayer
  ? layers.filter(({ id }) => id === probeLayer)
  : requestedLayer
    ? layers.filter(({ id }) => id === requestedLayer)
    : layers;

if (selected.length !== 1 && (probeLayer || requestedLayer)) failUsage("unknown Foundation layer");

const results = selected.map((layer) => runLayer(layer, probeLayer === layer.id));
const failure = results.find(({ status }) => status === "fail");
process.stdout.write(
  `${JSON.stringify({
    status: failure ? "fail" : "pass",
    failedLayer: failure?.id ?? null,
    layers: results,
    runtimeNetworkCapability: "none",
    visibleGuiLaunched: false,
  })}\n`,
);
process.exitCode = failure ? 1 : 0;

function readLayerArgument(flag: string): LayerId | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || !layers.some(({ id }) => id === value)) failUsage(`${flag} requires a layer`);
  return value as LayerId;
}

function runLayer(layer: LayerDefinition, injectFailure: boolean): LayerResult {
  const command = injectFailure ? process.execPath : layer.command;
  const args = injectFailure ? ["-e", "process.exit(23)"] : [...layer.args];
  const result = spawnSync(command, args, {
    cwd: root,
    env: {
      ...process.env,
      CARGO_NET_OFFLINE: "true",
      npm_config_offline: "true",
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
      SPECTRAFORM_RUNTIME_NETWORK_CAPABILITY: "none",
    },
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.stdout) process.stderr.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) process.stderr.write(`${layer.id}: ${result.error.message}\n`);
  const childExitCode = result.status ?? 127;
  return { id: layer.id, status: childExitCode === 0 ? "pass" : "fail", childExitCode };
}

function failUsage(message: string): never {
  process.stderr.write(`run-foundation-tests: ${message}\n`);
  process.exit(2);
}
