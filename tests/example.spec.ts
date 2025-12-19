import { test, expect } from '@playwright/test';
import { urlPairs } from './test-data';
import { viewports } from './viewport-config';

// Masking configuration: Add CSS selectors for elements to mask (sliders, carousels, etc.)
// These elements will be covered with a solid color in screenshots to ignore dynamic content
// Playwright's mask option will cover these elements with a solid color during screenshot
const elementsToMask = [
  // Add selectors for sliders, carousels, or other dynamic elements
  // Examples:
  // '.slider',
  // '.carousel',
  // '.swiper',
  // '[data-testid="dynamic-content"]',
  // '.slick-slider',
  // '.owl-carousel',
  // Add your selectors here
  "//div[contains(@class,'banner_home et_section_regular')]",
  "//div[contains(@class,'reviews_section et_pb_with_background')]"
];

// Helper function to get mask locators for screenshot
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
        console.log(`   🎭 Found ${count} element(s) to mask: ${selector}`);
      }
    } catch (error) {
      // Selector not found, continue
    }
  }
  if (maskLocators.length > 0) {
    console.log(`   ✅ Masking ${maskLocators.length} dynamic element(s) in screenshot`);
  }
  return maskLocators;
}

// Helper function to create a safe folder name from URL
function getFolderNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Get the pathname and remove leading/trailing slashes
    let folderName = urlObj.pathname.replace(/^\/|\/$/g, '') || 'home';
    // Replace slashes with dashes
    folderName = folderName.replace(/\//g, '-');
    // Remove or replace invalid filename characters
    folderName = folderName.replace(/[<>:"|?*]/g, '-');
    // Limit length
    if (folderName.length > 100) {
      folderName = folderName.substring(0, 100);
    }
    // Add domain prefix for uniqueness
    const domain = urlObj.hostname.replace(/\./g, '-');
    return `${domain}-${folderName}`;
  } catch {
    // Fallback if URL parsing fails
    return url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 100);
  }
}


// Test for each URL pair and viewport
urlPairs.forEach((urlPair, index) => {
  const folderName1 = getFolderNameFromUrl(urlPair.url1);
  const folderName2 = getFolderNameFromUrl(urlPair.url2);
  const testName = `URL Pair ${index + 1}: ${folderName1} vs ${folderName2}`;

  for (const [viewportName, viewport] of Object.entries(viewports)) {
    test(`${testName} - ${viewportName} view`, async ({ page }, testInfo) => {
      // Set viewport size
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const url1BaselineFolder = `${folderName1}-baseline-${viewportName}`;
      const snapshotPath1 = `${url1BaselineFolder}/${folderName1}-baseline-${viewportName}.png`;
      
      // Check if we're updating snapshots (--update-snapshots flag)
      // When --update-snapshots is passed, testInfo.config.updateSnapshots is set to 'changed'
      // 'all' = update all snapshots, 'changed' = update changed snapshots (--update-snapshots flag)
      // 'missing' = only update missing snapshots (default), 'none' = never update
      const configUpdateMode = testInfo.config.updateSnapshots;
      
      // Update mode is when we're updating snapshots (either 'all' or 'changed')
      const isUpdatingSnapshots = configUpdateMode === 'all' || configUpdateMode === 'changed';
      
      if (isUpdatingSnapshots) {
        // UPDATE MODE: Only capture URL1 and save as baseline
        console.log(`\n📸 UPDATE MODE: Capturing URL1 as baseline...`);
        await page.goto(urlPair.url1);
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(15000); // Wait for any dynamic content to load
        
        // Get mask locators for dynamic elements
        console.log(`🎭 Checking for elements to mask...`);
        const maskLocators1 = await getMaskLocators(page);
        
        const screenshot1 = await page.screenshot({ 
          fullPage: true,
          mask: maskLocators1.length > 0 ? maskLocators1 : undefined,
        });

        // Save as baseline
        expect(screenshot1).toMatchSnapshot(snapshotPath1, {
          threshold: 0.2,
        });
        console.log(`✅ Baseline saved: ${snapshotPath1}`);
      } else {
        // TEST MODE: Only capture URL2 and compare with baseline
        console.log(`\n📸 TEST MODE: Capturing URL2 and comparing with baseline...`);
        
        // Navigate to URL2 and take screenshot
        await page.goto(urlPair.url2);
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(15000); // Wait for any dynamic content to load
        
        // Get mask locators for dynamic elements
        console.log(`🎭 Checking for elements to mask...`);
        const maskLocators2 = await getMaskLocators(page);
        
        const screenshot2 = await page.screenshot({ 
          fullPage: true,
          mask: maskLocators2.length > 0 ? maskLocators2 : undefined,
        });

        // Compare with baseline
        // If baseline doesn't exist, this will FAIL (expected behavior)
        expect(screenshot2).toMatchSnapshot(snapshotPath1, {
          threshold: 0.2, // 20% pixel difference allowed
        });
        console.log(`✅ Comparison completed with baseline`);
      }
    });
  }
});
