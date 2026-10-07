import { test } from "@playwright/test";
import type { Page } from "@playwright/test";

export async function requireOfflineCheckpoints(page: Page) {
  const supported = await page.evaluate(
    () =>
      typeof OfflineAudioContext.prototype.suspend === "function" &&
      typeof OfflineAudioContext.prototype.resume === "function",
  );
  test.skip(
    !supported,
    "Native offline checkpoints unavailable; live lifecycle tests still run",
  );
}
