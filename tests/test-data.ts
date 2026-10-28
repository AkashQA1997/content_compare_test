/**
 * Public demo pairs. No login or private staging access is required.
 *
 * live  — captured as the baseline when you run --update-snapshots
 * stage — captured on a normal test run and compared with that baseline
 *
 * Pair 1 uses the same URL on both sides, so it should pass after a baseline update.
 * Pair 2 uses two different public pages, so the HTML report shows a visual diff.
 */
export const urlPairs = [
  {
    live: "https://demo.playwright.dev/todomvc/",
    stage: "https://demo.playwright.dev/todomvc/",
  },
  {
    live: "https://the-internet.herokuapp.com/",
    stage: "https://the-internet.herokuapp.com/login",
  },
];
