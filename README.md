# Texas Page Comparison - Playwright Visual Testing

## Overview

This project compares screenshots of two URLs using Playwright's built-in visual regression testing. Playwright automatically provides:
- **Actual** screenshot (URL2)
- **Expected** screenshot (URL1 baseline)
- **Diff** image (highlighted differences)
- **Side-by-side** comparison with slider

All visualizations are available in the Playwright HTML report.

## Commands

### 1. Create Baseline Images (First Time Setup)

```bash
npx playwright test --update-snapshots
```

**What it does:**
- Takes screenshots of URL1 (baseline) for all URL pairs
- Saves them as baseline snapshots
- These baselines are used for all future comparisons

**When to run:**
- First time setup
- When URL1 changes and you want to update the baseline

### 2. Run Tests (Compare URL2 with Baseline)

```bash
npx playwright test
```

**What it does:**
- Takes fresh screenshot of URL2
- Compares it with the saved URL1 baseline
- If baseline doesn't exist → Test FAILS (this is expected!)
- Shows diff visualization in HTML report

**When to run:**
- Regular testing to compare URL2 against baseline
- After making changes to URL2

## How It Works

1. **Baseline (URL1)**: Saved once, used for all comparisons
2. **Test Screenshot (URL2)**: Taken fresh on each test run
3. **Comparison**: Playwright compares URL2 with URL1 baseline
4. **Report**: View results in `playwright-report/index.html`

## Viewing Results

After running tests, open the HTML report:

```bash
npx playwright show-report
```

The report will show:
- ✅ **Pass**: Screenshots match (within 20% threshold)
- ❌ **Fail**: Screenshots differ (beyond 20% threshold)
- **Visual Diff**: Actual, Expected, Diff, and Side-by-side with slider

## Demo data

The repo ships with public pages so it can be shared and run without private URLs.

| File | What to edit |
| --- | --- |
| `tests/test-data.ts` | URL pairs. First pair should match. Second pair is expected to show a diff. |
| `tests/elements-to-mask.ts` | Regions painted over before compare (banner, footer, GitHub ribbon). |
| `tests/viewport-config.ts` | Two desktop sizes (1920×1080, 1366×768) and two phone sizes (390×844, 360×800). |

## Notes

- **Baseline must exist**: If baseline snapshot doesn't exist, test will fail. Run `--update-snapshots` first.
- **Threshold**: color distance of `0.5` per pixel (`threshold` in the spec)
- **Expected result**: the TodoMVC pair passes after a baseline update. The the-internet pair fails on purpose so the HTML report shows a visual diff.

