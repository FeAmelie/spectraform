import type { FullConfig } from "@playwright/test";

export default function configureHeadlessFoundationRun(config: FullConfig): void {
  if (config.workers !== 1) throw new Error("Foundation desktop smoke requires one worker");
  if (process.env.SPECTRAFORM_ALLOW_VISIBLE_GUI) {
    throw new Error("Visible GUI execution is forbidden for Foundation automation");
  }

  process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
  process.env.SPECTRAFORM_RUNTIME_NETWORK_CAPABILITY = "none";
}
