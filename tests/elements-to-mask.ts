/**
 * Demo regions to hide before the screenshot is compared.
 * Playwright paints these pink and ignores them in the diff.
 * A selector that is missing on a page is skipped.
 */
export const elementsToMask = [
  // TodoMVC: yellow demo banner and credits footer
  `//div[contains(., 'This is just a demo of TodoMVC')]`,
  `//footer[@class='info']`,

  // the-internet: GitHub ribbon and third-party footer
  `//img[@alt='Fork me on GitHub']`,
  `//div[@id='page-footer']`,
];
