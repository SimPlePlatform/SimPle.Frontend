import AxeBuilder from '@axe-core/playwright';
import { expect, test as base } from '@playwright/test';

export { expect };
export const test = base.extend({});

// Module E2E specs that import this fixture automatically scan their exercised page after each passing test.
// This is a focused regression check, not a replacement for the Module 14 manual/screen-reader review.
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') return;
  // API-only tests (using the `request` fixture) never navigate `page`, leaving it at about:blank —
  // scanning that would always fail on a document that was never meant to render anything.
  if (page.url() === 'about:blank') return;

  const results = await new AxeBuilder({ page }).analyze();
  const summary = results.violations
    .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} node(s))`)
    .join('\n');

  expect(results.violations, `axe accessibility violations:\n${summary}`).toEqual([]);
});
