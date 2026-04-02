import { test, expect } from '@playwright/test';
import { urlPairs } from './test-data';
import { viewports } from './viewport-config';

/**
 * SLIDER CAPTURE FEATURE:
 * 
 * To capture all slides in a slider/carousel separately:
 * 1. Add your slider configuration to the `slidersToCapture` array below
 * 2. Format: { selector: '.slider', slideCount: 5 }
 * 3. Optional: Add navigationSelector if your slider uses custom navigation
 * 
 * Example:
 * const slidersToCapture = [
 *   { selector: '.hero-slider', slideCount: 5 },
 *   { selector: '.testimonial-carousel', slideCount: 3, navigationSelector: '.carousel-dots button' }
 * ];
 * 
 * The test will:
 * - In UPDATE MODE: Capture each slide separately and save as baseline
 * - In TEST MODE: Navigate to each slide and compare with baseline
 * - Also capture a full page screenshot (excluding slider content)
 */

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
 // "//div[contains(@class,'banner_home et_section_regular')]",
 // "//div[contains(@class,'reviews_section et_pb_with_background')]"
];

// Slider configuration: Define sliders to capture all slides
// Format: { selector: string, slideCount: number, navigationSelector?: string }
// If navigationSelector is not provided, will try common patterns
interface SliderConfig {
  selector: string;
  slideCount: number;
  navigationSelector?: string;
}

const slidersToCapture: SliderConfig[] = [
  // Hero/Banner slider at the top of the page (4 slides)
  { 
    selector: '.banner_home', 
    slideCount: 4, 
    navigationSelector: '.banner_home .et-pb-controllers a[href="#"]' 
  },
  // Reviews slider section (5 slides)
  { 
    selector: '.reviews_section', 
    slideCount: 5, 
    navigationSelector: '.reviews_section .et-pb-controllers a[href="#"]' 
  },
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

// Helper function to navigate slider to a specific slide
async function navigateSliderToSlide(page: any, sliderConfig: { selector: string, slideCount: number, navigationSelector?: string }, slideIndex: number): Promise<boolean> {
  try {
    const slider = page.locator(sliderConfig.selector).first();
    if (await slider.count() === 0) {
      return false; // Slider not found
    }

    // Always reset to slide 0 first to ensure consistent starting point
    // (Only if we're not already trying to go to slide 0 to avoid recursion)
    if (slideIndex > 0) {
      // Reset to slide 0 by clicking the first navigation button
      try {
        const firstNavButton = page.locator(`${sliderConfig.selector} .et-pb-controllers a[href="#"], ${sliderConfig.selector} .slider-nav button, ${sliderConfig.selector} .carousel-indicators button`).first();
        if (await firstNavButton.count() > 0) {
          await firstNavButton.click();
          await page.waitForTimeout(1000); // Wait for reset
        }
      } catch (error) {
        // Ignore if can't reset
      }
    }

    let navigated = false;

    // Method 1: Use provided navigation selector (dots/indicators) - most reliable
    if (sliderConfig.navigationSelector) {
      try {
        // Scope the navigation selector to the slider
        const scopedSelector = `${sliderConfig.selector} ${sliderConfig.navigationSelector}`;
        const navButtons = page.locator(scopedSelector);
        const buttonCount = await navButtons.count();
        
        if (buttonCount > slideIndex) {
          const navButton = navButtons.nth(slideIndex);
          await navButton.click();
          await page.waitForTimeout(1500); // Wait for transition
          navigated = true;
          console.log(`   🎯 Navigated slider "${sliderConfig.selector}" to slide ${slideIndex} (${slideIndex + 1} of ${sliderConfig.slideCount}) using navigation selector`);
        }
      } catch (error) {
        console.log(`   ⚠️ Navigation selector failed: ${error}`);
      }
    }

    // Method 2: Try common navigation patterns
    if (!navigated) {
      const commonNavSelectors = [
        `${sliderConfig.selector} .et-pb-controllers a[href="#"]`,
        `${sliderConfig.selector} .slider-nav button`,
        `${sliderConfig.selector} .carousel-indicators button`,
        `${sliderConfig.selector} .slick-dots button`,
        `${sliderConfig.selector} [data-slide-to="${slideIndex}"]`,
        `${sliderConfig.selector} [aria-label*="slide ${slideIndex + 1}" i]`,
        `${sliderConfig.selector} [aria-label*="go to slide ${slideIndex + 1}" i]`,
      ];

      for (const navSelector of commonNavSelectors) {
        try {
          const navButtons = page.locator(navSelector);
          const buttonCount = await navButtons.count();
          
          if (buttonCount > slideIndex) {
            const navButton = navButtons.nth(slideIndex);
            await navButton.click();
            await page.waitForTimeout(1500); // Wait for transition
            navigated = true;
            console.log(`   🎯 Navigated slider "${sliderConfig.selector}" to slide ${slideIndex} using ${navSelector}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
    }

    // Method 3: Click next/prev buttons multiple times (fallback)
    if (!navigated) {
      try {
        // First, reset to beginning using prev button
        const prevButton = page.locator(`${sliderConfig.selector} .prev, ${sliderConfig.selector} [aria-label*="previous" i], ${sliderConfig.selector} [aria-label*="prev" i]`).first();
        if (await prevButton.count() > 0) {
          // Click prev multiple times to ensure we're at the start
          for (let i = 0; i < sliderConfig.slideCount; i++) {
            await prevButton.click();
            await page.waitForTimeout(300);
          }
        }

        // Now click next to reach desired slide
        const nextButton = page.locator(`${sliderConfig.selector} .next, ${sliderConfig.selector} [aria-label*="next" i]`).first();
        if (await nextButton.count() > 0) {
          for (let i = 0; i < slideIndex; i++) {
            await nextButton.click();
            await page.waitForTimeout(1000); // Wait for transition
          }
          navigated = true;
          console.log(`   🎯 Navigated slider "${sliderConfig.selector}" to slide ${slideIndex} using next button`);
        }
      } catch (error) {
        // Next/prev navigation didn't work
      }
    }

    // If slideIndex is 0, verify we're on the first slide
    if (!navigated && slideIndex === 0) {
      // Try clicking the first navigation button to ensure we're on slide 0
      try {
        const firstNavButton = page.locator(`${sliderConfig.selector} .et-pb-controllers a[href="#"], ${sliderConfig.selector} .slider-nav button, ${sliderConfig.selector} .carousel-indicators button`).first();
        if (await firstNavButton.count() > 0) {
          await firstNavButton.click();
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        // Ignore if can't click
      }
      navigated = true; // Assume we're on first slide
      console.log(`   🎯 Reset slider "${sliderConfig.selector}" to slide 0`);
    }

    if (navigated) {
      // Wait a bit more for any animations to complete
      await page.waitForTimeout(800);
      return true;
    }

    return false;
  } catch (error) {
    console.log(`   ⚠️ Could not navigate slider: ${error}`);
    return false;
  }
}

// Helper function to check if page is still open
async function isPageOpen(page: any): Promise<boolean> {
  try {
    // Try to access page properties to check if it's still open
    await page.url();
    return true;
  } catch (error) {
    return false;
  }
}

// Helper function to get all sliders that need slide-by-slide capture
async function getSlidersToCapture(page: any): Promise<SliderConfig[]> {
  const foundSliders: SliderConfig[] = [];
  
  for (const sliderConfig of slidersToCapture) {
    try {
      // Check if page is still open
      if (!(await isPageOpen(page))) {
        console.log(`   ⚠️  Page closed, cannot check for slider: ${sliderConfig.selector}`);
        break;
      }
      
      const slider = page.locator(sliderConfig.selector).first();
      if (await slider.count() > 0) {
        foundSliders.push(sliderConfig);
        console.log(`   🎠 Found slider: ${sliderConfig.selector} (${sliderConfig.slideCount} slides)`);
      }
    } catch (error) {
      // Slider not found, continue
    }
  }
  
  return foundSliders;
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
      // Increase timeout for tests with multiple slider comparisons
      test.setTimeout(300000); // 5 minutes
      
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
        
        // Check for sliders that need slide-by-slide capture
        const sliders = await getSlidersToCapture(page);
        
        if (sliders.length > 0) {
          // Capture each slide separately
          console.log(`🎠 Found ${sliders.length} slider(s) to capture slide-by-slide`);
          
          for (const sliderConfig of sliders) {
            console.log(`\n🎠 Processing slider: ${sliderConfig.selector} (${sliderConfig.slideCount} slides)`);
            for (let slideIndex = 0; slideIndex < sliderConfig.slideCount; slideIndex++) {
              console.log(`\n   📸 [URL1] Capturing slider "${sliderConfig.selector}" - slide ${slideIndex + 1} of ${sliderConfig.slideCount}...`);
              
              // Navigate to specific slide
              await navigateSliderToSlide(page, sliderConfig, slideIndex);
              
              // Get mask locators (excluding this slider since we're capturing it)
              const maskLocators1 = await getMaskLocators(page);
              
              // Take screenshot
              const screenshot1 = await page.screenshot({ 
                fullPage: true,
                mask: maskLocators1.length > 0 ? maskLocators1 : undefined,
              });

              // Save as baseline with slide index
              const slideSnapshotPath = `${url1BaselineFolder}/${folderName1}-baseline-${viewportName}-slider-${sliderConfig.selector.replace(/[^a-zA-Z0-9]/g, '-')}-slide-${slideIndex}.png`;
              expect(screenshot1).toMatchSnapshot(slideSnapshotPath, {
                threshold: 0.2,
              });
              console.log(`   ✅ [URL1] Baseline saved: ${slideSnapshotPath}`);
            }
          }
          
          // Also capture a regular screenshot (without slider navigation) for the rest of the page
          console.log(`\n   📸 Capturing full page baseline (non-slider content)...`);
          const maskLocators1 = await getMaskLocators(page);
          const screenshot1 = await page.screenshot({ 
            fullPage: true,
            mask: maskLocators1.length > 0 ? maskLocators1 : undefined,
          });
          expect(screenshot1).toMatchSnapshot(snapshotPath1, {
            threshold: 0.2,
          });
          console.log(`   ✅ Full page baseline saved: ${snapshotPath1}`);
        } else {
          // No sliders to capture, use regular flow
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
        }
      } else {
        // TEST MODE: Only capture URL2 and compare with baseline
        console.log(`\n📸 TEST MODE: Capturing URL2 and comparing with baseline...`);
        
        // Navigate to URL2 and take screenshot
        await page.goto(urlPair.url2);
        await page.waitForLoadState('load');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(15000); // Wait for any dynamic content to load
        
        // Check for sliders that need slide-by-slide capture
        const sliders = await getSlidersToCapture(page);
        
        // Collect all comparison failures and report at the end
        const failures: string[] = [];
        
        if (sliders.length > 0) {
          // Compare each slide separately
          console.log(`🎠 Found ${sliders.length} slider(s) to compare slide-by-slide`);
          
          for (const sliderConfig of sliders) {
            console.log(`\n🎠 Processing slider: ${sliderConfig.selector} (${sliderConfig.slideCount} slides)`);
            
            // Verify slider exists on URL2
            const sliderExists = await page.locator(sliderConfig.selector).count() > 0;
            if (!sliderExists) {
              const errorMsg = `Slider "${sliderConfig.selector}" not found on URL2`;
              console.log(`   ⚠️  WARNING: ${errorMsg}! Skipping...`);
              failures.push(errorMsg);
              continue;
            }
            
            for (let slideIndex = 0; slideIndex < sliderConfig.slideCount; slideIndex++) {
              console.log(`\n   📸 [URL2] Comparing slider "${sliderConfig.selector}" - slide ${slideIndex} (${slideIndex + 1} of ${sliderConfig.slideCount}) with URL1 baseline slide ${slideIndex}...`);
              
              try {
                // Check if page is still open before proceeding
                if (!(await isPageOpen(page))) {
                  const errorMsg = `Page closed before comparing slider "${sliderConfig.selector}" slide ${slideIndex}`;
                  console.log(`   ❌ ${errorMsg}`);
                  failures.push(errorMsg);
                  break; // Break out of slide loop if page is closed
                }
                
                // Navigate to specific slide (same index as URL1)
                const navigationSuccess = await navigateSliderToSlide(page, sliderConfig, slideIndex);
                if (!navigationSuccess) {
                  console.log(`   ⚠️  WARNING: Could not navigate to slide ${slideIndex}, attempting comparison anyway...`);
                }
                
                // Check page again after navigation
                if (!(await isPageOpen(page))) {
                  const errorMsg = `Page closed after navigating slider "${sliderConfig.selector}" to slide ${slideIndex}`;
                  console.log(`   ❌ ${errorMsg}`);
                  failures.push(errorMsg);
                  break;
                }
                
                // Wait a bit more to ensure slider has settled
                await page.waitForTimeout(1000);
                
                // Check page again before screenshot
                if (!(await isPageOpen(page))) {
                  const errorMsg = `Page closed before screenshot for slider "${sliderConfig.selector}" slide ${slideIndex}`;
                  console.log(`   ❌ ${errorMsg}`);
                  failures.push(errorMsg);
                  break;
                }
                
                // Get mask locators (excluding this slider since we're capturing it)
                const maskLocators2 = await getMaskLocators(page);
                
                // Take screenshot with error handling
                let screenshot2: Buffer | null = null;
                try {
                  screenshot2 = await page.screenshot({ 
                    fullPage: true,
                    mask: maskLocators2.length > 0 ? maskLocators2 : undefined,
                  });
                } catch (screenshotError: any) {
                  if (screenshotError.message?.includes('closed') || screenshotError.message?.includes('Target page')) {
                    const errorMsg = `Page closed during screenshot for slider "${sliderConfig.selector}" slide ${slideIndex}`;
                    console.log(`   ❌ ${errorMsg}`);
                    failures.push(errorMsg);
                    break; // Break out of slide loop
                  }
                  throw screenshotError; // Re-throw if it's a different error
                }

                // Only compare if screenshot was successfully taken
                if (screenshot2) {
                  // Compare with baseline (same slider, same slide index from URL1)
                  const slideSnapshotPath = `${url1BaselineFolder}/${folderName1}-baseline-${viewportName}-slider-${sliderConfig.selector.replace(/[^a-zA-Z0-9]/g, '-')}-slide-${slideIndex}.png`;
                  console.log(`   🔍 Comparing with baseline: ${slideSnapshotPath}`);
                  
                  try {
                    expect(screenshot2).toMatchSnapshot(slideSnapshotPath, {
                      threshold: 0.2, // 20% pixel difference allowed
                    });
                    console.log(`   ✅ [URL2] Slide ${slideIndex} (${slideIndex + 1} of ${sliderConfig.slideCount}) comparison PASSED (matched with URL1 slide ${slideIndex})`);
                  } catch (error: any) {
                    const errorMsg = `Slider "${sliderConfig.selector}" slide ${slideIndex} (${slideIndex + 1} of ${sliderConfig.slideCount}) - ${error.message || 'Comparison failed'}`;
                    console.log(`   ❌ [URL2] Slide ${slideIndex} comparison FAILED`);
                    failures.push(errorMsg);
                  }
                }
              } catch (error: any) {
                // Check if it's a page closure error
                if (error.message?.includes('closed') || error.message?.includes('Target page')) {
                  const errorMsg = `Page closed during comparison of slider "${sliderConfig.selector}" slide ${slideIndex}`;
                  console.log(`   ❌ ${errorMsg}`);
                  failures.push(errorMsg);
                  break; // Break out of slide loop if page is closed
                } else {
                  const errorMsg = `Slider "${sliderConfig.selector}" slide ${slideIndex} - Error: ${error.message || 'Unknown error'}`;
                  console.log(`   ❌ Error comparing slide ${slideIndex}: ${error.message || 'Unknown error'}`);
                  failures.push(errorMsg);
                }
              }
            }
          }
          
          // Also compare the regular full page screenshot
          console.log(`\n   📸 Comparing full page (non-slider content)...`);
          try {
            // Check if page is still open
            if (!(await isPageOpen(page))) {
              const errorMsg = `Page closed before full page comparison`;
              console.log(`   ❌ ${errorMsg}`);
              failures.push(errorMsg);
            } else {
              const maskLocators2 = await getMaskLocators(page);
              let screenshot2: Buffer | null = null;
              try {
                screenshot2 = await page.screenshot({ 
                  fullPage: true,
                  mask: maskLocators2.length > 0 ? maskLocators2 : undefined,
                });
              } catch (screenshotError: any) {
                if (screenshotError.message?.includes('closed') || screenshotError.message?.includes('Target page')) {
                  const errorMsg = `Page closed during full page screenshot`;
                  console.log(`   ❌ ${errorMsg}`);
                  failures.push(errorMsg);
                } else {
                  throw screenshotError;
                }
              }
              
              if (screenshot2) {
                expect(screenshot2).toMatchSnapshot(snapshotPath1, {
                  threshold: 0.2, // 20% pixel difference allowed
                });
                console.log(`   ✅ Full page comparison PASSED`);
              }
            }
          } catch (error: any) {
            if (error.message?.includes('closed') || error.message?.includes('Target page')) {
              const errorMsg = `Page closed during full page comparison`;
              console.log(`   ❌ ${errorMsg}`);
              failures.push(errorMsg);
            } else {
              const errorMsg = `Full page comparison - ${error.message || 'Comparison failed'}`;
              console.log(`   ❌ Full page comparison FAILED`);
              failures.push(errorMsg);
            }
          }
        } else {
          // No sliders to capture, use regular flow
          // Get mask locators for dynamic elements
          console.log(`🎭 Checking for elements to mask...`);
          try {
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
            console.log(`✅ Comparison completed with baseline - PASSED`);
          } catch (error: any) {
            const errorMsg = `Full page comparison - ${error.message || 'Comparison failed'}`;
            console.log(`❌ Comparison FAILED`);
            failures.push(errorMsg);
          }
        }
        
        // Report all failures at the end
        if (failures.length > 0) {
          console.log(`\n❌ TEST FAILED: ${failures.length} comparison(s) failed:\n`);
          failures.forEach((failure, index) => {
            console.log(`   ${index + 1}. ${failure}`);
          });
          throw new Error(`${failures.length} comparison(s) failed. See details above.`);
        } else {
          console.log(`\n✅ All comparisons PASSED!`);
        }
      }
    });
  }
});
