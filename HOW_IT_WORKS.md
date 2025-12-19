# How Playwright Snapshot Testing Works

## Overview

Playwright's `toMatchSnapshot()` is a visual regression testing tool that compares screenshots (or other values) against saved "baseline" images.

## How `npx playwright test --update-snapshots` Works

### Without `--update-snapshots` (Normal Run)

1. **If snapshot file doesn't exist:**
   - Test **FAILS** with error: "Snapshot doesn't exist"
   - You need to create it first with `--update-snapshots`

2. **If snapshot file exists:**
   - Compares current value with saved snapshot
   - If they match (within threshold): Test **PASSES** ✓
   - If they differ: Test **FAILS** ✗ and shows diff

### With `--update-snapshots` Flag

1. **Always saves/updates the snapshot:**
   - If snapshot doesn't exist: Creates it
   - If snapshot exists: **Overwrites** it with new value
   - Test **PASSES** (because it's updating, not comparing)

## Your Current Test Flow

### First Run (with `--update-snapshots`)

```
Step 1: Take screenshot of URL1 → screenshot1
Step 2: expect(screenshot1).toMatchSnapshot('url1-baseline.png')
        → Creates: url1-baseline.png (saves screenshot1) ✓

Step 3: Take screenshot of URL2 → screenshot2  
Step 4: expect(screenshot2).toMatchSnapshot('url2-screenshot.png')
        → Creates: url2-screenshot.png (saves screenshot2) ✓

Step 5: expect(screenshot2).toMatchSnapshot('url1-baseline.png')
        → url1-baseline.png already exists
        → Compares screenshot2 with saved screenshot1 ✓
        → If different, test fails (shows diff)
```

### Subsequent Runs (without `--update-snapshots`)

```
Step 2: expect(screenshot1).toMatchSnapshot('url1-baseline.png')
        → Compares screenshot1 with saved baseline ✓

Step 4: expect(screenshot2).toMatchSnapshot('url2-screenshot.png')
        → Compares screenshot2 with saved screenshot2 ✓

Step 5: expect(screenshot2).toMatchSnapshot('url1-baseline.png')
        → Compares screenshot2 with saved screenshot1 (URL1 baseline) ✓
        → This is the actual comparison you want!
```

### With `--update-snapshots` on Subsequent Runs

⚠️ **WARNING**: This will **overwrite** all snapshots, including your baseline!

```
Step 2: Updates url1-baseline.png with new screenshot1
Step 4: Updates url2-screenshot.png with new screenshot2
Step 5: Updates url1-baseline.png with screenshot2 (OVERWRITES URL1 BASELINE!)
```

## Recommended Workflow

### Initial Setup
```bash
# 1. First run - create all baselines
npx playwright test --update-snapshots
```

### Regular Testing
```bash
# 2. Run tests to compare (no flag)
npx playwright test
```

### When URLs Change
```bash
# 3. Update baselines if URL1 or URL2 changed
npx playwright test --update-snapshots
```

## Folder Structure Created

After running tests, you'll see:

```
tests/
  example.spec.ts-snapshots/
    texasprotax-com-home/
      baseline-desktop.png      (URL1 baseline)
      baseline-tablet.png
      baseline-mobile.png
    uiplonline-com-tpt-gsr-wordpress/
      screenshot-desktop.png   (URL2 screenshot)
      screenshot-tablet.png
      screenshot-mobile.png
    ... (more folders for each URL pair)
```

## Key Points

1. **Step 5 is the actual comparison**: It compares URL2 with URL1's baseline
2. **First run needs `--update-snapshots`**: To create initial baselines
3. **Subsequent runs don't need the flag**: They compare against baselines
4. **Use `--update-snapshots` carefully**: It overwrites existing snapshots
5. **Threshold (0.2)**: Allows 20% pixel difference before test fails

## Troubleshooting

**Test fails on first run?**
- Run with `--update-snapshots` to create baselines

**Want to update baselines?**
- Run with `--update-snapshots` (but be careful - it updates everything)

**Only want to update URL1 baseline?**
- Manually delete the snapshot file, or modify the test temporarily

