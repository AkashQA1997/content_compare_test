import { test, expect } from "@playwright/test";
import { urlPairs } from "./test-data";
import { viewports } from "./viewport-config";
import crypto from "crypto";

/**
 * MASKED SCREENSHOT WITH LAZY SCROLL
 */

// ------------------ NEW: Short Name Generator ------------------
function getShortName(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex").substring(0, 8);
}
// ---------------------------------------------------------------

// Masking configuration
const elementsToMask = [
  `//div[@class="slick marquee award-bg slick-initialized slick-slider"]`,
  `//video[@class="banner-video"]`,
  `//div[@class='img-container']/img[@alt='Chatbot avatar']`,
  `//div[@id='headerIconContainer']/img[@alt='Chatbot avatar']`,
  `//div[@id='chatWindow']`,
  `(//div[@class='slider-for slick-initialized slick-slider'])[2]`,
  `(//div[@class='slider-for slick-initialized slick-slider'])[1]`,
  `//div[@class="container-fluid container-poster-slider section-block"]`,
];

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

// Helper: Lazy scroll
async function lazyScroll(page: any, scrollStep = 500, delay = 300) {
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  let currentPosition = 0;
  while (currentPosition < bodyHeight) {
    currentPosition += scrollStep;
    await page.evaluate((pos) => window.scrollTo(0, pos), currentPosition);
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
        await page.waitForTimeout(60000);

        const maskLocators = await getMaskLocators(page);

        const screenshot = await page.screenshot({
          fullPage: true,
          mask: maskLocators.length > 0 ? maskLocators : undefined,
        });

        await expect(screenshot).toMatchSnapshot(snapshotPath, {
          threshold: 0.2,
        });

        console.log(`✅ Baseline saved: ${snapshotPath}`);
      } else {
        console.log(`📸 TEST MODE: ${shortName}`);

        await page.goto(urlPair.stage);
        await page.waitForLoadState("load");
        // await page.waitForLoadState('networkidle');
        await page.waitForLoadState("domcontentloaded");
        await lazyScroll(page);
        await page.waitForTimeout(60000);

        const maskLocators = await getMaskLocators(page);

        const screenshot = await page.screenshot({
          fullPage: true,
          mask: maskLocators.length > 0 ? maskLocators : undefined,
        });

        await expect(screenshot).toMatchSnapshot(snapshotPath, {
          threshold: 0.2,
        });

        console.log(`✅ Compared: ${shortName}`);
      }
    });
  }
});
