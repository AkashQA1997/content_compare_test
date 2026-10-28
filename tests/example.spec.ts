import { test, expect } from "@playwright/test";
import { urlPairs } from "./test-data";
import { viewports } from "./viewport-config";
import { elementsToMask } from "./elements-to-mask";
import { createHash } from "crypto";

/**
 * MASKED SCREENSHOT WITH LAZY SCROLL
 */

// ------------------ NEW: Short Name Generator ------------------
function getShortName(input: string): string {
  return createHash("md5").update(input).digest("hex").substring(0, 8);
}
// ---------------------------------------------------------------

// Helper: Get locators for masking
async function getMaskLocators(page: any): Promise<any[]> {
  const maskLocators: any[] = [];
  for (const selector of elementsToMask) {
    try {
      const locator = page.locator(selector);
      const count = await locator.count();
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          maskLocators.push(locator.nth(i));
        }
      }
    } catch {}
  }
  return maskLocators;
}

const closeButtonXPath = `//span[@class="button b-close"]`;

// Helper: Dismiss popup close button when present
async function clickCloseButtonIfPresent(page: any) {
  const closeButton = page.locator(`xpath=${closeButtonXPath}`);
  const count = await closeButton.count();
  for (let i = 0; i < count; i++) {
    const btn = closeButton.nth(i);
    if (await btn.isVisible()) {
      await btn.click({ timeout: 5000 });
      await page.waitForTimeout(2000);
    }
  }
}

// Helper: Lazy scroll
async function lazyScroll(page: any, scrollStep = 500, delay = 500) {
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  let currentPosition = 0;
  while (currentPosition < bodyHeight) {
    currentPosition += scrollStep;
    await page.evaluate((pos: number) => window.scrollTo(0, pos), currentPosition);
    await page.waitForTimeout(delay);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

// ------------------ MAIN TEST ------------------

urlPairs.forEach((urlPair, index) => {
  const shortName = getShortName(urlPair.live);

  const testName = `URL Pair ${index + 1}: ${shortName}`;

  // 🔥 Debug mapping (VERY IMPORTANT)
  // console.log(`🔗 ${shortName}`);
  //console.log(`   LIVE: ${urlPair.live}`);
  //console.log(`   STAGE: ${urlPair.stage}`);

  for (const [viewportName, viewport] of Object.entries(viewports)) {
    test(`${testName} - ${viewportName} view`, async ({ page }, testInfo) => {
      test.setTimeout(300000);

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      // ✅ Short + Safe Paths
      const baselineFolder = `baseline-${viewportName}`;
      const snapshotPath = `${baselineFolder}/${shortName}.png`;

      const configUpdateMode = testInfo.config.updateSnapshots;
      const isUpdatingSnapshots =
        configUpdateMode === "all" || configUpdateMode === "changed";

      if (isUpdatingSnapshots) {
        console.log(`📸 UPDATE MODE: ${shortName}`);

        await page.goto(urlPair.live);
        console.log("Live URL loaded " + urlPair.live);
        await page.waitForLoadState("load");
        // await page.waitForLoadState('networkidle');
        await page.waitForLoadState("domcontentloaded");
        await lazyScroll(page);
        //await page.waitForTimeout(5000);
        await clickCloseButtonIfPresent(page);

        const maskLocators = await getMaskLocators(page);

        const screenshot = await page.screenshot({
          fullPage: true,
          mask: maskLocators.length > 0 ? maskLocators : undefined,
        });

        await expect(screenshot).toMatchSnapshot(snapshotPath, {
          threshold: 0.5,
        });

        console.log(`✅ Baseline saved: ${snapshotPath}`);
      } else {
        console.log(`📸 TEST MODE: ${shortName}`);

        await page.goto(urlPair.stage);
        await page.waitForLoadState("load");
        // await page.waitForLoadState('networkidle');
        await page.waitForLoadState("domcontentloaded");
        await lazyScroll(page);
        //await page.waitForTimeout(5000);
        await clickCloseButtonIfPresent(page);

        const maskLocators = await getMaskLocators(page);

        const screenshot = await page.screenshot({
          fullPage: true,
          mask: maskLocators.length > 0 ? maskLocators : undefined,
        });

        await expect(screenshot).toMatchSnapshot(snapshotPath, {
          threshold: 0.5,
        });

        console.log(`✅ Compared: ${shortName}`);
      }
    });
  }
});
