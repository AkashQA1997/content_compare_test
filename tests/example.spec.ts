import { test, expect } from '@playwright/test';
import { urlPairs } from './test-data';
import { viewports } from './viewport-config';

/**
 * MASKED SCREENSHOT WITH LAZY SCROLL
 * - Captures full page screenshots with dynamic elements masked
 * - Uses lazy scroll to load lazy-loaded content
 * - Supports update mode (--update-snapshots) and test mode
 */

// Masking configuration: CSS selectors for elements to mask
const elementsToMask = [
  `//div[@class="slick marquee award-bg slick-initialized slick-slider"]`,
  // '.carousel',
  // '.swiper',
  // '[data-testid="dynamic-content"]',
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
        console.log(`🎭 Found ${count} element(s) to mask: ${selector}`);
      }
    } catch {}
  }
  if (maskLocators.length > 0) {
    console.log(`✅ Masking ${maskLocators.length} dynamic element(s) in screenshot`);
  }
  return maskLocators;
}

// Helper: Lazy scroll to trigger lazy-loading content
async function lazyScroll(page: any, scrollStep = 500, delay = 300) {
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  let currentPosition = 0;
  while (currentPosition < bodyHeight) {
    currentPosition += scrollStep;
    await page.evaluate((pos) => window.scrollTo(0, pos), currentPosition);
    await page.waitForTimeout(delay);
  }
  // Scroll back to top before screenshot
  await page.evaluate(() => window.scrollTo(0, 0));
}

// Helper: Generate safe folder name from URL
function getFolderNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    let folderName = urlObj.pathname.replace(/^\/|\/$/g, '') || 'home';
    folderName = folderName.replace(/\//g, '-').replace(/[<>:"|?*]/g, '-');
    if (folderName.length > 100) folderName = folderName.substring(0, 100);
    const domain = urlObj.hostname.replace(/\./g, '-');
    return `${domain}-${folderName}`;
  } catch {
    return url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 100);
  }
}

// Main test: Iterate over URL pairs and viewports
urlPairs.forEach((urlPair, index) => {
  const folderName1 = getFolderNameFromUrl(urlPair.live);
  const folderName2 = getFolderNameFromUrl(urlPair.stage);
  const testName = `URL Pair ${index + 1}: ${folderName1} vs ${folderName2}`;

  for (const [viewportName, viewport] of Object.entries(viewports)) {
    test(`${testName} - ${viewportName} view`, async ({ page }, testInfo) => {
      test.setTimeout(300000); // 5 minutes
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const baselineFolder = `${folderName1}-baseline-${viewportName}`;
      const snapshotPath = `${baselineFolder}/${folderName1}-baseline-${viewportName}.png`;
      const configUpdateMode = testInfo.config.updateSnapshots;
      const isUpdatingSnapshots = configUpdateMode === 'all' || configUpdateMode === 'changed';

      if (isUpdatingSnapshots) {
        // UPDATE MODE: Capture live page
        console.log(`📸 UPDATE MODE: Capturing live as baseline...`);
        await page.goto(urlPair.live);
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(15000);

        // Lazy scroll to load all content
        await lazyScroll(page);

        const maskLocators = await getMaskLocators(page);
        const screenshot = await page.screenshot({
          fullPage: true,
          mask: maskLocators.length > 0 ? maskLocators : undefined,
        });

        expect(screenshot).toMatchSnapshot(snapshotPath, { threshold: 0.2 });
        console.log(`✅ Baseline saved: ${snapshotPath}`);
      } else {
        // TEST MODE: Capture stage page and compare
        console.log(`📸 TEST MODE: Capturing stage and comparing with baseline...`);
        await page.goto(urlPair.stage);
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(15000);

        // Lazy scroll to load all content
        await lazyScroll(page);

        const maskLocators = await getMaskLocators(page);
        const screenshot = await page.screenshot({
          fullPage: true,
          mask: maskLocators.length > 0 ? maskLocators : undefined,
        });

        expect(screenshot).toMatchSnapshot(snapshotPath, { threshold: 0.2 });
        console.log(`✅ Comparison completed with baseline`);
      }
    });
  }
});