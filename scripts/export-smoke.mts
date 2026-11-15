import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const test = spawnSync(process.execPath, ["--test", "tests/visual/foundation-frame.test.ts"], {
  cwd: root,
  stdio: "inherit",
});
if (test.status !== 0) process.exit(test.status ?? 1);

const ffmpeg = spawnSync("ffmpeg", ["-version"], { cwd: root, encoding: "utf8" });
const report = ffmpeg.error
  ? {
      status: "capability-skip",
      reason: "FFmpeg is unavailable; run `brew bundle --file Brewfile` before native export work.",
    }
  : {
      status: "capability-skip",
      reason:
        "The deterministic export adapter is introduced by FND-016; synthetic frame smoke passed.",
    };

console.log(JSON.stringify({ ...report, externalAssets: 0, runtimeNetworkCapability: "none" }));
